#include "opencv2/videoio.hpp"
#include "opencv2/core.hpp"
#include "opencv2/imgproc.hpp"
#include "opencv2/features2d.hpp"
#include "opencv2/highgui.hpp"
#include "opencv2/calib3d.hpp"
#include "opencv2/xfeatures2d.hpp"
#include <iostream>
#include <cstring>
using namespace std;
using namespace cv;
using namespace cv::xfeatures2d;

const string windowName = "IntSys - detection and tracking";
const string editedName = "HSV applied";

int main( int argc, char** argv ){
	VideoCapture cap(0);
	Mat object = imread(argv[1], IMREAD_GRAYSCALE);
	Mat colorFrame;
	Mat frame;

	int minHessian = 700;
	Ptr<SURF> detector = SURF::create(minHessian);
	
	vector<KeyPoint> keypointsObj, keypointsScene;
	Mat descriptorObj, descriptorScene;

	detector->detectAndCompute(object, Mat(), keypointsObj, descriptorObj);

	while(waitKey(1) != 27) {
		cap >> colorFrame;
		cvtColor(colorFrame, frame, COLOR_BGR2GRAY);
		detector->detectAndCompute(frame, Mat(), keypointsScene, descriptorScene);

		FlannBasedMatcher matcher;
		vector<DMatch> matches;
		matcher.match(descriptorObj, descriptorScene, matches);

		double maxDist = 0;
		double minDist = 100;
		for (int i = 0; i < descriptorObj.rows; i++) {
			double dist = matches[i].distance;
			if (dist < minDist) {
				minDist = dist;
			}
			if (dist > maxDist) {
				maxDist = dist;
			}
		}

		vector<DMatch> goodMatches;
		for (int i = 0; i < descriptorObj.rows; i++) {
			if (matches[i].distance <= max(2 * minDist, 0.02)) {
				goodMatches.push_back(matches[i]);
			}
		}

		if (goodMatches.size() > 8) {

			// Mat imgMatches;
			// drawMatches(object, keypointsObj, frame, keypointsScene, goodMatches, imgMatches, Scalar::all(-1), Scalar::all(-1), vector<char>(), DrawMatchesFlags::NOT_DRAW_SINGLE_POINTS);

			vector<Point2f> obj;
			vector<Point2f> scene;
			for (size_t i = 0; i < goodMatches.size(); i++) {
				obj.push_back(keypointsObj[goodMatches[i].queryIdx].pt);
				scene.push_back(keypointsScene[goodMatches[i].trainIdx].pt);
			}

			Mat H = findHomography(obj, scene, RANSAC);

			vector<Point2f> objCorners(4);
			objCorners[0] = cvPoint(0, 0);
			objCorners[1] = cvPoint(object.cols, 0);
			objCorners[2] = cvPoint(object.cols, object.rows);
			objCorners[3] = cvPoint(0, object.rows);

			vector<Point2f> sceneCorners(4);
			
			cout << goodMatches.size() << endl;
			try {
				perspectiveTransform(objCorners, sceneCorners, H);

				for (int i = 0; i < 4; i++) {
					line(colorFrame, sceneCorners[i], sceneCorners[(i + 1) % 4], Scalar(0, 255, 0), 4);
				}
			} catch (...) {

			}
		}

		imshow("Matches", colorFrame);
	}
}
