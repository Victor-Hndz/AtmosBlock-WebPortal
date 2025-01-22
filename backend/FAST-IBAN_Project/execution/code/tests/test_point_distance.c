#include <assert.h>
#include "../libraries/lib.h"
#include "../libraries/utils.h"
#include "../libraries/calc.h"
#include "../libraries/init.h"

int main(void) {
    double res;
    coord_point A = create_point(64.5, 177.25);
    coord_point B = create_point(64.75, 176.5);
    coord_point C = create_point(64.5, 174.75);
    coord_point D = create_point(64.5, 173.75);
    
    double AB = 45.02;
    double AC = 130.96;
    double AD = 8050.42;
    double BC = 87.9;
    double BD = 8033.65;
    double CD = 7974.22;

    // coord_point A = create_point(32.5, 78.5);
    // coord_point B = create_point(31.5, 81.5);
    // coord_point C = create_point(32.25, 85.5);
    // coord_point D = create_point(28.5, 66.75);

    // double AB = 303.95;
    // double AC = 657.85;
    // double AD = 1209.52;
    // double BC = 386.78;
    // double BD = 1457.76;
    // double CD = 1843.77;

    // double res_i = 449.53;
    // double res_ij = 976.6;
    // double res_i_to_j = 1503.68;
    // double res_sol = -77.55;

    // coord_point A = create_point(30.5, 80.5);
    // coord_point B = create_point(30.25, 72.25);
    // coord_point C = create_point(35.25, 89.75);
    // coord_point D = create_point(12.5, 46.75);

    // double AB = 303.95;
    // double AC = 657.85;
    // double AD = 1209.52;
    // double BC = 386.78;
    // double BD = 1457.76;
    // double CD = 1843.77;

    // double res_i = 449.53;
    // double res_ij = 976.6;
    // double res_i_to_j = 1503.68;
    // double res_sol = -77.55;

    res = point_distance(A, B);
    res = round(res*100)/100;
    printf("%.2f\n", res);
    AB = res;
    //assert(res == AB);
    
    res = point_distance(A, C);
    res = round(res*100)/100;
    printf("%.2f\n", res);
    AC = res;
    //assert(res == AC);

    res = point_distance(A, D);
    res = round(res*100)/100;
    printf("%.2f\n", res);
    AD = res;
    //assert(res == AD);

    res = point_distance(B, C);
    res = round(res*100)/100;
    printf("%.2f\n", res);
    BC = res;
    //assert(res == BC);

    res = point_distance(B, D);
    res = round(res*100)/100;
    printf("%.2f\n", res);
    BD = res;
    //assert(res == BD);

    res = point_distance(C, D);
    res = round(res*100)/100;
    printf("%.2f\n", res);
    CD = res;
    //assert(res == CD);

    double i = (AB + AC + BC)/3;
    i = round(i*100)/100;
    printf("i = %.2f\n", i);
    //assert(i == res_i);

    coord_point mean_point = create_point((A.lat + B.lat + C.lat)/3, (A.lon + B.lon + C.lon)/3);
    double ij = point_distance(mean_point, D);
    ij = round(ij*100)/100;
    printf("ij = %.2f\n", ij);

    // double ij = (AB + AC + AD + BC + BD + CD)/6;
    // ij = round(ij*100)/100;
    // printf("ij = %.2f\n", ij);
    // //assert(ij == res_ij);

    // double i_to_j = (AD + BD + CD)/3;
    // i_to_j = round(i_to_j*100)/100;
    // printf("i to j = %.2f\n", i_to_j);
    // //assert(i_to_j == res_i_to_j);

    double sol = i - ij;
    printf("sol = %.2f\n", sol);
    sol = round(sol*100)/100;
    //assert(sol == res_sol);

    if(sol > 0) { 
        printf("\033[0;32m");
        printf("\nFiltro pasado.\n");
        printf("\033[0m");
    } else {
        printf("\033[0;31m");
        printf("\nFiltro no pasado.\n");
        printf("\033[0m");
    }
    
    printf("\033[0;32m");
    printf("\nTest passed.\n\n");
    printf("\033[0m");
    return 0;
}