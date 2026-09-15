#if !defined(UTILS)
#define UTILS

#include "lib.h"
#include <limits.h>


void export_clusters_to_csv(points_cluster *clusters, int size, char *filename, double offset, double scale_factor, int time);
void export_formation_to_csv(formation formation, char *filename, int time);
int findIndex(float *arr, int n, float target);
int findIndex_sin_contar(float *arr, int n, float target);
#endif // UTILS