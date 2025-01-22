#include <assert.h>
#include "../libraries/lib.h"


int main(void) {
    coord_point point = create_point(1.0, 2.0);
    assert(point.lat == 1.0);
    assert(point.lon == 2.0);
    
    printf("Test passed.\n");
    return 0;
}
