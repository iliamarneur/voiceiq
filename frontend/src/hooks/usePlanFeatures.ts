import { useState, useEffect } from 'react';
import axios from 'axios';

interface PlanFeatures {
  plan_id: string;
  plan_name?: string;
  features: string[];
  max_dictionaries: number;
  max_workspaces: number;
}

const DEFAULT: PlanFeatures = {
  plan_id: '',
  features: [],
  max_dictionaries: 0,
  max_workspaces: 0,
};

export function usePlanFeatures() {
  const [data, setData] = useState<PlanFeatures>(DEFAULT);

  useEffect(() => {
    axios.get('/api/subscription/features')
      .then(r => setData(r.data))
      .catch(() => {});
  }, []);

  const hasFeature = (f: string) => data.features.includes(f);

  return { ...data, hasFeature };
}
