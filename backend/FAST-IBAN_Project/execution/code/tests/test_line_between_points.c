#include <assert.h>
#include "../libraries/lib.h"

void calculate_line(coord_point p1, coord_point p2, float *m, float *c) {
    *m = (p2.lon - p1.lon) / (p2.lat - p1.lat);
    *c = p1.lon - *m * p1.lat;
}


void cruzar_mapa(coord_point start, coord_point end) {
    float m, c;
    int x, y;
    int deltaX = end.lat - start.lat;
    int deltaY = end.lon - start.lon;

    calculate_line(start, end, &m, &c);
    assert(m == 2.0);
    assert(c == 5.0);

    if(deltaX >= deltaY) {
        for(x = start.lat; x <= end.lat; x++) {
            y = round(m * x + c);
            printf("Posición actual: (%d, %d)\n", x, y);
        }
    } else {
        for(y = start.lon; y <= end.lon; y++) {
            x = round((y - c) / m);
            printf("Posición actual: (%d, %d)\n", x, y);
        }
    }
}


int main(void) {
    coord_point start = create_point(-1.0, 3.0);
    coord_point end = create_point(3.0, 11.0);

    cruzar_mapa(start, end);
    
    printf("Test passed.\n");
    return 0;
}
