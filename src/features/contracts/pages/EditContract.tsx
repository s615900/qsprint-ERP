"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetContract, useUpdateContract } from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { CONTENT_LOCKED_MESSAGE, isContentLocked } from "@/lib/contractStatus";
import { ContractForm } from "../components/ContractForm";

export function EditContract() {
  const { id } = useParams<{ id: string }>();
  const contractId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: contract, isLoading } = useGetContract(contractId, { query: { enabled: !!contractId } });
  const updateContract = useUpdateContract();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">載入中...</div>;
  if (!contract) return <div className="p-8 text-center text-destructive">找不到此合約</div>;
  if (isContentLocked(contract) || contract.status === "作廢" || contract.status === "已結案") {
    return <div className="p-8 text-center text-muted-foreground">{CONTENT_LOCKED_MESSAGE}</div>;
  }

  return (
    <ContractForm
      initial={contract}
      heading="編輯合約"
      subheading={contract.contract_number}
      backHref={`/contracts/${contract.id}`}
      submitLabel="儲存變更"
      isPending={updateContract.isPending}
      onSubmit={(data) => {
        // quote_id isn't editable
        const { quote_id: _quoteId, ...rest } = data;
        void _quoteId;
        updateContract.mutate(
          { id: contract.id, data: rest },
          {
            onSuccess: () => {
              toast.success("合約已更新");
              invalidateApi(queryClient, "/api/contracts");
              router.push(`/contracts/${contract.id}`);
            },
            onError: () => toast.error("儲存失敗"),
          },
        );
      }}
    />
  );
}
