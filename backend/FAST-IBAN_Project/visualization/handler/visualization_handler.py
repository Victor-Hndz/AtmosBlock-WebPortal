import subprocess
import sys
import os
import json
import asyncio
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor
import time

sys.path.append('/app/')

from visualization.mapGeneration.generate_maps import generate_map_parallel
from utils.rabbitMQ.rabbitmq import RabbitMQ
from utils.rabbitMQ.process_body import process_body
from utils.rabbitMQ.create_message import create_message
from utils.rabbitMQ.notify_updates import notify_update
from utils.rabbitMQ.rabbit_consts import NOTIFICATIONS_EXCHANGE, NOTIFY_HANDLER_KEY, EXECUTION_VISUALIZATION_QUEUE, NOTIFY_VISUALIZATION

from utils.consts.consts import STATUS_OK, STATUS_ERROR

# Directory for map output
OUT_DIR = "./out"

async def handle_message(body, rabbitmq_client):
    """Process the message received by the general handler, and launch the map generation."""
    data = process_body(body)
    
    print("\n[ ] Iniciando generación de mapas...")
    notify_update(rabbitmq_client, 1, "MAPS: Iniciando generación de mapas.")
    
    # Create output directory if it doesn't exist
    os.makedirs(f"{OUT_DIR}/{data['request_hash']}", exist_ok=True)
    
    # Prepare arguments for parallel processing
    map_tasks = []
    for pressure_level in data["pressure_level"]:
        for year in data["years"]:
            for month in data["months"]:
                for day in data["days"]:
                    for hour in data["hours"]:
                        for map_type in data["map_types"]:
                            for map_range in data["map_ranges"]:
                                for map_level in data["map_levels"]:
                                    map_tasks.append((
                                        data["file_name"],
                                        data["request_hash"],
                                        data["variable_name"],
                                        pressure_level,
                                        year,
                                        month,
                                        day,
                                        hour,
                                        map_type,
                                        map_range,
                                        map_level,
                                        data["file_format"],
                                        data["area_covered"]
                                    ))
    
    # Use ProcessPoolExecutor for true parallel processing
    start_time = time.time()
    results = []
    
    # Determine optimal number of processes
    num_cpus = min(os.cpu_count() or 2, 8)  # Use up to 8 processes
    
    cont = 0
    
    print(f"Starting map generation with {num_cpus} processes for {len(map_tasks)} maps...")
    try:
        # Use process pool for true parallelism
        with ProcessPoolExecutor(max_workers=num_cpus) as executor:
            # Submit all tasks
            futures = [executor.submit(generate_map_parallel, task) for task in map_tasks]
            
            # Process results as they complete
            for future in futures:
                try:
                    cont += 1
                    notify_update(rabbitmq_client, 1, f"MAPS: Generando mapa{cont} de {len(map_tasks)}.")
                    result = future.result()
                    results.append(result)
                    notify_update(rabbitmq_client, 1, "MAPS: Mapa generado con éxito.")
                except Exception as e:
                    print(f"Error in map generation task: {e}")
                    results.append(False)
                    
        end_time = time.time()
        duration = end_time - start_time
        maps_per_second = len(map_tasks) / duration if duration > 0 else 0
        
        print(f"Map generation completed in {duration:.2f} seconds ({maps_per_second:.2f} maps/sec)")
        
        # Check if all maps were generated successfully
        if all(results) and results:
            print("\n✅ Generación de mapas completada exitosamente.")
            message = {
                "request_type": NOTIFY_VISUALIZATION,
                "exec_status": STATUS_OK, 
                "exec_message": f"Map generation completed successfully. Generated {len(results)} maps in {duration:.2f} seconds."
            }
            await rabbitmq_client.publish(
                NOTIFICATIONS_EXCHANGE,
                NOTIFY_HANDLER_KEY,
                create_message(
                    STATUS_OK,
                    "",
                    message,
                )
            )     
            return True
        else:
            error_msg = f"Failed to generate {results.count(False)} of {len(results)} maps"
            print(f"Error: {error_msg}")
            message = { "request_type": NOTIFY_VISUALIZATION, "exec_status": STATUS_ERROR, "exec_message": error_msg}
            await rabbitmq_client.publish(
                NOTIFICATIONS_EXCHANGE,
                NOTIFY_HANDLER_KEY,
                create_message(
                    STATUS_OK,
                    "",
                    message,
                )
            )
            return False
            
    except Exception as e:
        error_msg = f"Error in map generation: {str(e)}"
        print(f"Error: {error_msg}")
        message = { "request_type": NOTIFY_VISUALIZATION, "exec_status": STATUS_ERROR, "exec_message": error_msg}
        await rabbitmq_client.publish(
            NOTIFICATIONS_EXCHANGE,
            NOTIFY_HANDLER_KEY,
            create_message(
                STATUS_OK,
                "",
                message,
            )
        )
        return False


if __name__ == "__main__":
    # Set multiprocessing start method
    mp.set_start_method('spawn', force=True)
    
    async def main():
        # Initialize the RabbitMQ connection
        rabbitmq_client = RabbitMQ()
        await rabbitmq_client.initialize()
        
        # Create a wrapper to pass the rabbitmq client to the handler
        async def message_handler(body):
            return await handle_message(body, rabbitmq_client)
        
        # Start consuming messages
        await rabbitmq_client.consume(
            EXECUTION_VISUALIZATION_QUEUE, 
            callback=message_handler
        )
        
        # Keep the application running
        try:
            # Run forever
            await asyncio.Future()
        except KeyboardInterrupt:
            print("Shutting down...")
        finally:
            # Close the connection when done
            await rabbitmq_client.close()
    
    # Run the async main function
    asyncio.run(main())
