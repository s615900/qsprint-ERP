"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateContract } from "@/lib/api-client";
import { invalidateApi } from "@/lib/invalidate";
import { ContractForm } from "../components/ContractForm";

export function NewContract() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createContract = useCreateContract();

  return (
    <ContractForm
      heading="新增合約"
      subheading="也可以在報價單頁按「建立合約」，自動帶入客戶與品項。"
      backHref="/contracts"
      submitLabel="建立合約"
      isPending={createContract.isPending}
      onSubmit={(data) =>
        createContract.mutate(
          { data },
          {
            onSuccess: (contract) => {
              toast.success("合約已建立");
              invalidateApi(queryClient, "/api/contracts");
              router.push(`/contracts/${contract.id}`);
            },
            onError: () => toast.error("建立失敗，請檢查必填欄位"),
          },
        )
      }
    />
  );
}
