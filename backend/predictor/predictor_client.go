// predictor/predictor_client.go
package predictor

import (
	\"context\"
	\"log\"
	\"time\"

	\"google.golang.org/grpc\"
	\"google.golang.org/grpc/credentials/insecure\"
)

func PredictRHA(featureNames []string, featureValues []float64) (float64, error) {
	// Set up a connection to the server.
	conn, err := grpc.Dial(\"localhost:50051\", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Printf(\"did not connect: %v\", err)
		return 0, err // Nilai default dan error
	}
	defer conn.Close()
	c := NewPredictorClient(conn)

	// Prepare the request
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	req := &PredictRequest{
		FeatureNames:  featureNames,
		FeatureValues: featureValues,
	}

	// Call the PredictRHA method
	r, err := c.PredictRHA(ctx, req)
	if err != nil {
		log.Printf(\"could not predict: %v\", err)
		return 0, err // Nilai default dan error
	}
	log.Printf(\"RHA Prediction: %f\", r.RhaPrediction)
	return r.RhaPrediction, nil
}
