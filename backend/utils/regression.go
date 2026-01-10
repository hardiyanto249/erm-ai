package utils

import (
	"gonum.org/v1/gonum/mat"
)

// PredictionModelConfig defines which math model to use
type PredictionModelConfig string

const (
	ModelSimple       PredictionModelConfig = "SIMPLE"
	ModelMultivariate PredictionModelConfig = "MULTIVARIATE"
)

// ActiveModel is the feature flag. CHANGE THIS to switch strategies.
var ActiveModel = ModelMultivariate

// SimpleLinearRegression calculates the slope (beta) and intercept (alpha) for Y = alpha + beta*X
func SimpleLinearRegression(x, y []float64) (float64, float64, float64) {
	if len(x) != len(y) || len(x) == 0 {
		return 0, 0, 0
	}

	n := float64(len(x))
	var sumX, sumY, sumXY, sumXX float64

	for i := 0; i < len(x); i++ {
		sumX += x[i]
		sumY += y[i]
		sumXY += x[i] * y[i]
		sumXX += x[i] * x[i]
	}

	slope := (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX)
	intercept := (sumY - slope*sumX) / n
	strength := 0.85 // Dummy strength

	return slope, intercept, strength
}

// MultivariateLinearRegression calculates coefficients (betas) for Y = Beta0 + Beta1*X1 + Beta2*X2 ...
// xData is a flat slice of all predictors row by row. nSamples is number of rows. nPredictors is number of features.
// Returns: Coefficients slice (Intercept is index 0), R-Squared
func MultivariateLinearRegression(yData []float64, xData []float64, nSamples, nPredictors int) ([]float64, float64) {
	// Prepare Y Matrix (col vector)
	Y := mat.NewDense(nSamples, 1, yData)

	// Prepare X Matrix (Design Matrix)
	// Must add column of 1s for Intercept (Beta0)
	X := mat.NewDense(nSamples, nPredictors+1, nil)
	for i := 0; i < nSamples; i++ {
		X.Set(i, 0, 1.0) // Intercept term
		for j := 0; j < nPredictors; j++ {
			// xData is expected to be [Row1X1, Row1X2, Row2X1, Row2X2...]
			val := xData[i*nPredictors+j]
			X.Set(i, j+1, val)
		}
	}

	// Use QR Decomposition to Solve X * B = Y (Minimize ||XB - Y||)
	// This is more numerically stable than Normal Equations (Inverse(X'X))
	var qr mat.QR
	qr.Factorize(X)

	var B mat.Dense
	err := qr.SolveTo(&B, false, Y)
	if err != nil {
		// Fallback to Zeros if solve fails
		return make([]float64, nPredictors+1), 0.0
	}

	// Extract coefficients
	coeffs := make([]float64, nPredictors+1)
	for i := 0; i < nPredictors+1; i++ {
		coeffs[i] = B.At(i, 0)
	}

	// Calculate R-Squared
	// SS_res = Sum((y - pred)^2)
	// SS_tot = Sum((y - mean_y)^2)
	var ssRes, ssTot, meanY float64
	for _, y := range yData {
		meanY += y
	}
	meanY /= float64(len(yData))

	for i := 0; i < nSamples; i++ {
		// Get Prediction
		yVal := yData[i]

		// Manual Dot Product for Pred selection
		// pred = coeff[0] + coeff[1]*x1 + ...
		pred := coeffs[0]
		for j := 0; j < nPredictors; j++ {
			pred += coeffs[j+1] * xData[i*nPredictors+j]
		}

		ssRes += (yVal - pred) * (yVal - pred)
		ssTot += (yVal - meanY) * (yVal - meanY)
	}

	if ssTot == 0 {
		return coeffs, 0.0
	}
	rSquared := 1.0 - (ssRes / ssTot)

	return coeffs, rSquared
}

// PredictValueSimple uses simple regression
func PredictValueSimple(slope, intercept, currentX float64) float64 {
	return intercept + slope*currentX
}

// PredictValueMultivariate uses coefficients and input vector
// inputs must match nPredictors size (without intercept 1.0)
func PredictValueMultivariate(coeffs []float64, inputs []float64) float64 {
	if len(coeffs) != len(inputs)+1 {
		return 0
	}
	result := coeffs[0] // Intercept
	for i, val := range inputs {
		result += coeffs[i+1] * val
	}
	return result
}
