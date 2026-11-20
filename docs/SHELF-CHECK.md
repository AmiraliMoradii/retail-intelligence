# Experimental shelf check

Open **Cameras & Aisles** and select **Check start of sample** or **Check end of sample**. The bundled video shows three packages disappearing from the marked section. In a local build, you can choose an MP4 from a fixed camera, save a stocked frame and an empty frame, then scrub to a moment to check. Align the section with the marked area. The program compares pixels in three sampled frames with the references and returns an unclear result if the most recent two classifications disagree or the frames are too different from both references.

The browser decodes the selected file locally without transferring it. References are cleared when switching videos. The result does not change inventory or orders. A change of viewpoint, lighting, product display, or an object in front of the shelf can affect the result. This check estimates the visible area, and does not identify products or count stock behind the first row.

## Datasets for evaluating a future detector

- [Empty Shelf Detection by Policenta, version 2](https://universe.roboflow.com/policenta/empty-shelf-detection/dataset/2) contains annotated shelf images. The publisher lists CC BY 4.0. It is a candidate for evaluating whether an image-based detector can localize visible gaps.
- [Retail Shelf Availability by Nick Workplace, version 1](https://universe.roboflow.com/nick-workplace/retail-shelf-availability-r4z1v/dataset/1) lists CC BY 4.0 and labels `empty_slot` and `facing_full`. Keep different stores or camera views in separate development and evaluation splits when provenance allows.
- [SKU-110K](https://github.com/eg4000/SKU110K_CVPR19#dataset) labels product boxes, and its publisher restricts the dataset to academic, non-commercial use.

The shipped check uses the bundled synthetic clip and manually chosen references. These external datasets were identified for further evaluation. They were not imported, used for training, or used to measure accuracy. For a real video pilot, label stocked, empty, and obstructed intervals in separate fixed-camera clips and measure missed gaps and false alerts per camera.
