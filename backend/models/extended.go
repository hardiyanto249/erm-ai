package models

type ComplianceItem struct {
	ID        string `json:"id"`
	LazID     int    `json:"laz_id"`
	Text      string `json:"text"`
	Completed bool   `json:"completed"`
}

type ZisSummary struct {
	LazID            int   `json:"laz_id"`
	TotalCollected   int64 `json:"total_collected"`
	TotalDistributed int64 `json:"total_distributed"`
	MuzakkiCount     int   `json:"muzakki_count"`
	MustahikCount    int   `json:"mustahik_count"`
	ProgramReach     int   `json:"program_reach"` // in provinces
	OperationalFunds int64 `json:"operational_funds"`
	ProductiveFunds  int64 `json:"productive_funds"`
}

type ZisCollectionBreakdown struct {
	LazID    int    `json:"laz_id"`
	Category string `json:"category"` // e.g., Zakat, Infaq
	Value    int64  `json:"value"`
}

type ZisDistributionBreakdown struct {
	LazID  int    `json:"laz_id"`
	Ashnaf string `json:"ashnaf"` // e.g., Fakir, Miskin
	Amount int64  `json:"amount"`
}

type ZisData struct {
	Summary      ZisSummary                 `json:"summary"`
	Collection   []ZisCollectionBreakdown   `json:"collection"`
	Distribution []ZisDistributionBreakdown `json:"distribution"`
}
