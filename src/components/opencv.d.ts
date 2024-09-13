declare module 'opencv_v1.js' {
    export class Mat {
      constructor();
      delete(): void;
      empty(): boolean;
      clone(): Mat;
      // tensorToMat() :tf.tensor;
      // matToTensor(): tf.tensor;
      // normalizeImage(): tf.tensor;
      // hsvToRgb(): tf.tensor
    } 
  }
  