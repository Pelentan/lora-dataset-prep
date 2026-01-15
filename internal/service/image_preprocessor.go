package service

import (
	"fmt"
	"image"
	"image/color"
	"path/filepath"

	"github.com/disintegration/imaging"
	"github.com/mshaver/lora-prep/internal/models"
)

type ImagePreprocessor struct {
	targetSize int
}

func NewImagePreprocessor() *ImagePreprocessor {
	return &ImagePreprocessor{
		targetSize: 1024,
	}
}

func (ip *ImagePreprocessor) ProcessImage(sourcePath, destPath string, method string, cropParams *models.CropParams) error {
	img, err := imaging.Open(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to open image: %v", err)
	}

	var processed image.Image

	switch method {
	case "letterbox":
		processed = ip.letterbox(img)
		
	case "crop":
		if cropParams == nil {
			return fmt.Errorf("crop parameters required for crop method")
		}
		processed = ip.cropAndResize(img, cropParams)
		
	default:
		return fmt.Errorf("unknown preprocessing method: %s", method)
	}

	ext := filepath.Ext(destPath)
	switch ext {
	case ".jpg", ".jpeg":
		err = imaging.Save(processed, destPath, imaging.JPEGQuality(95))
	case ".png":
		err = imaging.Save(processed, destPath)
	default:
		err = imaging.Save(processed, destPath)
	}

	if err != nil {
		return fmt.Errorf("failed to save processed image: %v", err)
	}

	return nil
}

func (ip *ImagePreprocessor) letterbox(img image.Image) image.Image {
	resized := imaging.Fit(img, ip.targetSize, ip.targetSize, imaging.Lanczos)
	
	canvas := imaging.New(ip.targetSize, ip.targetSize, color.Black)
	
	processed := imaging.PasteCenter(canvas, resized)
	
	return processed
}

func (ip *ImagePreprocessor) cropAndResize(img image.Image, params *models.CropParams) image.Image {
	cropped := imaging.Crop(img, image.Rect(
		params.X,
		params.Y,
		params.X+params.Width,
		params.Y+params.Height,
	))
	
	resized := imaging.Resize(cropped, ip.targetSize, ip.targetSize, imaging.Lanczos)
	
	return resized
}
