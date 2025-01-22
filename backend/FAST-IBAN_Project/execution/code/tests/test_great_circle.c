#include <assert.h>
#include "../libraries/calc.h"

int main(void) {
    coord_point final = coord_from_great_circle(create_point(50.0, 2.0), 300, 90);
    final.lat = round(final.lat*100)/100;
    final.lon = round(final.lon*100)/100;
    assert(final.lat == 49.92);
    assert(final.lon == 6.19);

    final = coord_from_great_circle(create_point(50.0, 2.0), 300, -90);
    final.lat = round(final.lat*100)/100;
    final.lon = round(final.lon*100)/100;
    assert(final.lat == 49.92);
    assert(final.lon == -2.19);

    printf("Test passed.\n");
    return 0;
}
