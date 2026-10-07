import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateComplaintInput } from '@soliton/api-contract';
import { api } from '../api';

export const COMPLAINTS_KEY = 'complaints';

export function useMyComplaints() {
  return useQuery({
    queryKey: [COMPLAINTS_KEY, 'mine'],
    queryFn: () => api.complaints.listMine(),
    staleTime: 30_000,
  });
}

export function useSubmitComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateComplaintInput) => api.complaints.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [COMPLAINTS_KEY] }),
  });
}
