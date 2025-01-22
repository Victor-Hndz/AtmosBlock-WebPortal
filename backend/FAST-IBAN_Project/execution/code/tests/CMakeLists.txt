cmake_minimum_required(VERSION 3.8...3.27)

project(TESTS)

# add_executable(TEST_coordpoint test_coordpoint.c)
# add_executable(TEST_great_circle test_great_circle.c)
# add_executable(TEST_bilinear_int test_bilinear_int.c)
# add_executable(TEST_point_dist test_point_distance.c)
# add_executable(TEST_contours test_contours.c)
# add_executable(TEST_bearing test_bearing_points.c)
add_executable(TEST_lines test_line_between_points.c)


# target_link_libraries(TEST_coordpoint LIB)

# target_link_libraries(TEST_great_circle LIB CALC)
# target_link_libraries(TEST_great_circle m)

# target_link_libraries(TEST_bilinear_int LIB CALC)
# target_link_libraries(TEST_bilinear_int m)

# target_link_libraries(TEST_point_dist LIB CALC UTILS INIT)
# target_link_libraries(TEST_point_dist m)

# target_link_libraries(TEST_contours LIB CALC UTILS INIT)
# target_link_libraries(TEST_contours m)
# target_link_libraries(TEST_contours netcdf)

# target_link_libraries(TEST_bearing LIB CALC UTILS INIT)
# target_link_libraries(TEST_bearing m)
target_link_libraries(TEST_lines LIB)



# add_test(NAME test_coordpoint COMMAND TEST_coordpoint)
# add_test(NAME test_great_circle COMMAND TEST_great_circle)
# add_test(NAME test_bilinear_int COMMAND TEST_bilinear_int)
# add_test(NAME test_point_dist COMMAND TEST_point_dist)
# add_test(NAME test_contours COMMAND TEST_contours)
# add_test(NAME test_bearing COMMAND TEST_bearing)
add_test(NAME test_lines COMMAND TEST_lines)