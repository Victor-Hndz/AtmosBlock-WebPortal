#include <assert.h>
#include "../libraries/lib.h"
#include "../libraries/calc.h"


int main(void) {
    coord_point p = coord_from_great_circle(create_point(50.0, 2.0), 300, 90); // 49.92, 6.19

    coord_point p11 = {floor(p.lat/RES)*RES, floor(p.lon/RES)*RES}; //p1
    coord_point p12 = {floor(p.lat/RES)*RES, ceil(p.lon/RES)*RES}; //p2
    coord_point p21 = {ceil(p.lat/RES)*RES, floor(p.lon/RES)*RES}; //p3
    coord_point p22 = {ceil(p.lat/RES)*RES, ceil(p.lon/RES)*RES}; //p4
    
    double z1 = 57425.5;
    double z2 = 57426.8;
    double z3 = 57426.6;
    double z4 = 57427.6;
    double z = 0;

    z = (((p22.lat-p.lat)*(p22.lon-p.lon))/((p22.lat-p11.lat)*(p22.lon-p11.lon)))*z1 + 
        (((p.lat-p11.lat)*(p22.lon-p.lon))/((p22.lat-p11.lat)*(p22.lon-p11.lon)))*z2 + 
        (((p22.lat-p.lat)*(p.lon-p11.lon))/((p22.lat-p11.lat)*(p22.lon-p11.lon)))*z3 + 
        (((p.lat-p11.lat)*(p.lon-p11.lon))/((p22.lat-p11.lat)*(p22.lon-p11.lon)))*z4;

    z = round(z*10)/10;
    assert(z == 57427.1);
    printf("Test passed.\n");
    return 0;
}
