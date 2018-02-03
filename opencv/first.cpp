#include "opencv2/imgcodecs.hpp"
#include "opencv2/highgui.hpp"
#include "opencv2/imgproc.hpp"
#include <iostream>

using namespace std;
using namespace cv;

const int ALPHA_SLIDER_MAX = 100;
const int BETA_SLIDER_MAX = 100;
int alphaSlider = 0;
int betaSlider = 0;
double alpha = 1;
int beta = 0;

int edgeThreshold = 1;
int lowThreshold;
const int LOW_THRESHOLD_MAX = 100;
int ratio = 3;
int kernelSize = 3;

const String windowName = "IntSys - Filters";
const String edgeWindowName = "IntSys - Canny edge detection";

Mat image;
Mat imageGray;
Mat transformedImage;
Mat edgesImage;
Mat edges;

void onThresholdTrackbar(int, void*) {
    cvtColor(transformedImage, imageGray, COLOR_BGR2GRAY);
    blur(imageGray, edges, Size(3, 3));
    Canny(edges, edges, lowThreshold, lowThreshold * ratio, kernelSize);
    edgesImage = Scalar::all(0);
    transformedImage.copyTo(edgesImage, edges);
    imshow(edgeWindowName, edgesImage);
}

void updateImage() {
    image.convertTo(transformedImage, -1, alpha, beta);
    imshow(windowName, transformedImage);
    onThresholdTrackbar(0, 0);
}

void onAlphaTrackbar(int, void*) {
    alpha = (2.f * alphaSlider) / 100 + 1;
    updateImage();
}

void onBetaTrackbar(int, void*) {
    beta = betaSlider;
    updateImage();
}

int main( int argc, char** argv ) {
    String imageName("../data/lena.jpg"); // by default
    if (argc > 1) {
        imageName = argv[1];
    }

    image = imread(imageName);
    transformedImage.create(image.size(), image.type());
    edgesImage.create(transformedImage.size(), transformedImage.type());

    namedWindow(windowName, WINDOW_AUTOSIZE);
    namedWindow(edgeWindowName, WINDOW_AUTOSIZE);

    createTrackbar("Contrast", windowName, &alphaSlider, ALPHA_SLIDER_MAX, onAlphaTrackbar);
    createTrackbar("Brightness", windowName, &betaSlider, BETA_SLIDER_MAX, onBetaTrackbar);
    updateImage();

    createTrackbar("Min threshold:", edgeWindowName, &lowThreshold, LOW_THRESHOLD_MAX, onThresholdTrackbar);
    onThresholdTrackbar(0, 0);

    waitKey();
    return 0;
}