cmake_minimum_required(VERSION 2.8)
project(IntSys)
find_package(OpenCV REQUIRED)
include_directories(${OpenCV_INCLUDE_DIRS})
add_executable(filters first.cpp)
add_executable(video second.cpp)
target_link_libraries(filters ${OpenCV_LIBS})
target_link_libraries(video ${OpenCV_LIBS})