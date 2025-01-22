#include <assert.h>
#include "../libraries/lib.h"
#include "../libraries/utils.h"
#include "../libraries/calc.h"
#include "../libraries/init.h"

int main(void) {
    coord_point initial = {65.5, -73.5};
    coord_point final = {66.25, -66};
    coord_point point_aux;
    double bearing, dist, next_dist;
    
    bearing = bearing_from_points(initial, final);
    dist = point_distance(initial, final);

    printf("Bearing from points: %f\n", bearing);
    printf("Distance between points: %f\n", dist);
    
    next_dist = R*cos(initial.lat* M_PI / 180)*(RES*M_PI / 180);
    printf("Next distance: %f\n", next_dist);

    point_aux = coord_from_great_circle(initial, next_dist, bearing);
    printf("Next point: %f %f\n", point_aux.lat, point_aux.lon);

    next_dist = R*cos(point_aux.lat* M_PI / 180)*(RES*M_PI / 180);
    printf("Next distance 2: %f\n", next_dist);

    point_aux = coord_from_great_circle(point_aux, next_dist, bearing);
    printf("Next point 2: %f %f\n", point_aux.lat, point_aux.lon);

    while(point_aux.lat < final.lat || point_aux.lon < final.lon) {
        next_dist = R*cos(point_aux.lat* M_PI / 180)*(RES*M_PI / 180);
        printf("Loop Next distance: %f\n", next_dist);
        point_aux = coord_from_great_circle(point_aux, next_dist, bearing);
        printf("Loop Next point: %f %f\n", point_aux.lat, point_aux.lon);
    }
    printf("Final point: %f %f\n", point_aux.lat, point_aux.lon);
    
    printf("\033[0;32m");
    printf("\nTest passed.\n\n");
    printf("\033[0m");
    return 0;
}