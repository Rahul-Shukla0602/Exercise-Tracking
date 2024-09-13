import React, { useRef, useState, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import * as tf from '@tensorflow/tfjs'
import { Button } from "./ui/button"
import { Mat , calcOpticalFlowFarneback, COLOR_HSV2BGR} from '@techstark/opencv-js';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { AlertCircle, Camera as CameraIcon, StopCircle } from 'lucide-react'

export function matToTensor(mat: Mat): tf.Tensor {
  const data = new Uint8Array(mat.data);
  return tf.tensor3d(data, [mat.rows, mat.cols, mat.channels()], 'int32');
}
export function normalizeImage(tensor: tf.Tensor): tf.Tensor {
  return tensor.div(tf.scalar(255.0));
}

export function tensorToMat(tensor: tf.Tensor): Mat {
  const [height, width, channels] = tensor.shape;
  const data = tensor.dataSync();
  const mat = new cv.Mat(height, width, cv.CV_8UC1(channels));
  mat.data.set(new Uint8Array(data.buffer));
  return mat;
}

export default function AIPushUpCounter() {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [model, setModel] = useState< tf.LayersModel | null >(null)
  const [count, setCount] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false)
  const [prevFrame, setPrevFrame] = useState<Mat | null>(null)

  const [up, setUp] = useState(0)
  const [down, setDown] = useState(0)
  const [noMove, setNoMove] = useState(0)
  const [currentMove, setCurrentMove] = useState(0)
  const [initial, setInitial] = useState(-1)

  // let flow: Mat = new Mat();
  
// camera permission - hasPermission, error, isCameraOn
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      setError(null)
      setIsCameraOn(true)
    } catch (err) {
      setHasPermission(false)
      setError('Camera permission denied. Please enable camera access to use this app.')
    }
  }

// stop camera -  hasPermission, isActive, isCameraOn
  const stopCamera = () => {
    if (webcamRef.current && webcamRef.current.video?.srcObject) {
      const mediaStream = webcamRef.current.video.srcObject as MediaStream
      mediaStream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
    }
    setIsCameraOn(false)
    setHasPermission(null)
    setIsActive(false)
  }


// model loading from api - json , bin (model manifesto and weights)
  useEffect(() => {
    if (hasPermission) {
      const loadModel = async () => {
        try {
          console.log("Attempting to load model from:", "https://dinesh-shukla.github.io/tfjs-model-hosting_v1/model.json");
          const loadedModel = await tf.loadLayersModel("https://dinesh-shukla.github.io/tfjs-model-hosting_v1/model.json");
          // const loadedModel = tf.keras.models.load_model('../../model/model.h5')
          console.log(loadModel)
          setModel(loadedModel);
          console.log("Model loaded successfully");
        } catch (err) {
          console.error("Error loading model:", err);
          if (err instanceof Error) {
            setError(`Failed to load the model: ${err.message}`);
          } else {
            setError('Failed to load the model. Please check the console for more details.');
          }
        }
      }
      loadModel()
    }
  }, [hasPermission])


// count show on screen
const drawCanvas = useCallback((video: HTMLVideoElement, videoWidth: number, videoHeight: number, flowImage: tf.Tensor3D) => {
  const ctx = canvasRef.current?.getContext('2d')
  if (ctx) {
    canvasRef.current!.width = videoWidth
    canvasRef.current!.height = videoHeight
    tf.browser.toPixels(flowImage, canvasRef.current!)
    ctx.font = '30px Arial'
    ctx.fillStyle = 'white'
    ctx.fillText(`Repetitions: ${count}`, 10, 50)
  }
}, [count])

// handling count from predicted hightes probability
// 1. Prediction 0 (Downward Movement) |
//    - Increment down counter
//    - If down == 2:
//      - If initial == -1, set initial to 0
//      - If currentMove == 2, increment count and reset currentMove
//      - Reset up and noMove counters

// 2. Prediction 2 (Upward Movement)
//    - Increment up counter
//    - If `up == 2` and `initial != -1`:
//      - Set `currentMove` to `2`
//      - Reset `down` and `noMove` counters

// 3. except (No Move)
//    - Increment noMove counter
//    - If noMove == 14:
//      - Set currentMove to 1
//    - If noMove > 10:
//      - Reset up and down counters



  const handleRepetitionCounting = useCallback((prediction: number) => {
    if (prediction === 0) {
      setDown(prev => prev + 1);
      if (down === 2) {
        if (initial === -1) {
          setInitial(0);
        }
        if (currentMove === 2) {
          setCount(prev => prev + 1);
        }
        setCurrentMove(0);
      } else if (down > 0) {
        setUp(0);
        setNoMove(0);
      }
      
    } else if (prediction === 2) {
      setUp(prev => prev + 1);
      if (up === 2 && initial !== -1) {
        setCurrentMove(2);
      } else if (up > 1) {
        setDown(0);
        setNoMove(0);
      }
    } else {
      setNoMove(prev => prev + 1);
      if (noMove === 14) {
        setCurrentMove(1);
      } else if (noMove > 10) {
        setUp(0);
        setDown(0);
      } 
    }
    console.log(`Prediction: ${prediction}, Up: ${up}, Down: ${down}, NoMove: ${noMove}, CurrentMove: ${currentMove}, Count: ${count}`);
  }, [down, up, noMove, initial, count, currentMove]);

  /*
  model - state (weigth || null)
  we need a tensor image frame from the brower for the real-time image processing
  so curr. video frame into a tensor [h, w, 3]
  model takes - 64*64
  downsample the frame using bilinear interpolation 64*64
  normalize - add dimension - predict - find argmax - predicted 
*/
const processFrame = useCallback(async () => {
  if (model && webcamRef.current && webcamRef.current.video) {
    const video = webcamRef.current.video
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight
    const imageTensor = tf.browser.fromPixels(video).toFloat()
    const currFrame = imageTensor
    const flow : Mat = new Mat()
    if(prevFrame != null){
       calcOpticalFlowFarneback(prevFrame, tensorToMat(currFrame), flow, 0.5, 3, 15, 3, 5, 1.2, 0);
       const [flowX, flowY] = tf.split(matToTensor(flow), 2, 2)
        const [mag, ang] = tf.tidy(() => {
          const magnitude = tf.sqrt(tf.add(tf.square(flowX), tf.square(flowY)))
          const angle = tf.atan2(flowY, flowX)
          return [magnitude, angle]
        })
        const hsv = tf.tidy(() => {
          const h = tf.mul(ang, 180 / Math.PI / 2)
          const s = tf.ones(h.shape)
          const v = normalizeImage(mag)
          return tf.stack([h, s, v], 2)
        })
        const rgb = COLOR_HSV2BGR(hsv)
        const resized = tf.image.resizeBilinear(rgb, [64, 64])
        const normalized = resized.div(255.0)
        const batched = normalized.expandDims(0)
        const prediction = await model.predict(batched) as tf.Tensor
        const predictionIndex = tf.argMax(prediction, 1).dataSync()[0]
        handleRepetitionCounting(predictionIndex)
        drawCanvas(video, videoWidth, videoHeight, rgb)
        tf.dispose([flow, flowX, flowY, mag, ang, hsv, rgb, resized, normalized, batched, prediction])
    }
    setPrevFrame(tensorToMat(currFrame))
  }
}, [model, handleRepetitionCounting, drawCanvas, prevFrame])


// excution of 20 frame processing 
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (model && isActive) {
      interval = setInterval(() => {
        processFrame()
      }, 50)
    } else if (interval) {
      clearInterval(interval)
    }
    return () => {
      if (interval) clearInterval(interval)
      if (prevFrame)  matToTensor(prevFrame).dispose()
    }
  }, [model, isActive, processFrame, prevFrame])


// testing api respones
  useEffect(() => {
    const testModelJson = async () => {
      try {
        const response = await fetch('https://dinesh-shukla.github.io/tfjs-model-hosting_v1/model.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        console.log("Successfully fetched and parsed model.json:", json);
      } catch (error) {
        console.error("Error fetching model.json:", error);
      }
    };
  
    testModelJson();
  }, []);

  const toggleActive = () => setIsActive(!isActive)

  
  // reset all count
  const resetCount = () => {
    setCount(0)
    setUp(0)
    setDown(0)
    setNoMove(0)
    setCurrentMove(0)
    setInitial(-1)
  }

  return (
    <div className="min-h-screen bg-gray-300 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-3xl bg-gray-200">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-gray-900">AI Exercise Reps Counter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {hasPermission === false && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Camera Permission Required</AlertTitle>
                <AlertDescription>
                  {error || 'Please enable camera access to use this app.'}
                </AlertDescription>
              </Alert>
            )}
            {hasPermission === null && (
              <div className="text-center">
                <Button onClick={requestCameraPermission} size="lg" className="mt-4 border-2 border-indigo-500">
                  <CameraIcon className="mr-2 h-4 w-4"/>
                  Grant Camera Permission
                </Button>
              </div>
            )}
            {hasPermission === true && (
              <>
                <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
                  {isCameraOn ? (
                    <>
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                        videoConstraints={{
                          width: 640,
                          height: 480,
                          facingMode: "user"
                        }}
                      />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"/>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                      <CameraIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="text-center text-5xl font-bold text-gray-900">
                  {count} Reps
                </div>
                <div className="flex justify-center space-x-4">
                  <Button className="border-2 border-indigo-500" onClick={toggleActive} disabled={!!error || !model} size="lg">
                    {isActive ? 'Pause' : 'Start'}
                  </Button>
                  <Button className="border-2 border-indigo-500" onClick={resetCount} variant="outline" disabled={!!error || !model} size="lg">
                    Reset
                  </Button>
                  <Button className="border-2 border-indigo-500" onClick={stopCamera} variant="outline" disabled={!isCameraOn} size="lg">
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop Camera
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}