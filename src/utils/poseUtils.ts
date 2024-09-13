import * as posenet from '@tensorflow-models/posenet'

export const drawKeypoints = (keypoints: posenet.Keypoint[], minConfidence: number, ctx: CanvasRenderingContext2D, scale = 1) => {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i]

    if (keypoint.score < minConfidence) {
      continue
    }

    const { y, x } = keypoint.position
    ctx.beginPath()
    ctx.arc(x * scale, y * scale, 3, 0, 2 * Math.PI)
    ctx.fillStyle = 'red'
    ctx.fill()
  }
}

export const drawSkeleton = (keypoints: posenet.Keypoint[], minConfidence: number, ctx: CanvasRenderingContext2D, scale = 1) => {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence)

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
      toTuple(keypoints[0].position),
      toTuple(keypoints[1].position),
      'green',
      scale,
      ctx
    )
  })
}

const drawSegment = ([ay, ax]: [number, number], [by, bx]: [number, number], color: string, scale: number, ctx: CanvasRenderingContext2D) => {
  ctx.beginPath()
  ctx.moveTo(ax * scale, ay * scale)
  ctx.lineTo(bx * scale, by * scale)
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.stroke()
}

const toTuple = ({ y, x }: { y: number, x: number }): [number, number] => [y, x]