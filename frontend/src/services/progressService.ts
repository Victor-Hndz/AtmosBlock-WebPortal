import { API_URL } from "@/consts/apiConsts";

export const ProgressService = {
  connectToProgressStream: (): EventSource => {
    const progressStreamUrl = `${API_URL}/progress/stream`;

    return new EventSource(progressStreamUrl);
  },

  simulateProgressUpdates: (callback: (data: { increment: number; message: string }) => void): (() => void) => {
    let progress = 0;

    // Send initial progress
    callback({ increment: progress, message: "Starting process..." });

    // Create interval to update progress
    const intervalId = setInterval(() => {
      // Random increment between 5-15%
      const increment = Math.floor(Math.random() * 11) + 5;
      progress = Math.min(100, progress + increment);

      // Generate appropriate message based on progress
      let message = "";
      if (progress < 25) {
        message = "Initializing resources...";
      } else if (progress < 50) {
        message = "Processing data...";
      } else if (progress < 75) {
        message = "Generating results...";
      } else if (progress < 100) {
        message = "Finalizing process...";
      } else {
        message = "Process completed successfully!";
        clearInterval(intervalId);
      }

      // Send the progress update
      callback({ increment: progress, message });
    }, 2000); // Update every 2 seconds

    // Return cleanup function
    return () => clearInterval(intervalId);
  },
};

export default ProgressService;
