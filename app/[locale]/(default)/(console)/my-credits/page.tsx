import Empty from "@/components/blocks/empty";
import TableSlot from "@/components/console/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getCreditsByUserUuid } from "@/models/credit";
import { getTranslations } from "next-intl/server";
import { getUserCredits } from "@/services/credit";
import { getUserUuid } from "@/services/user";
import { enrichCreditsWithResources, truncateResourceTitle, getResourceLinkTitle } from "@/utils/creditUtils";
import { getTransactionTypeText, isResourceAccessTransaction } from "@/constants/transactionTypes";
import moment from "moment";

export default async function MyCreditsPage() {
  const t = await getTranslations();

  const user_uuid = await getUserUuid();

  if (!user_uuid) {
    return <Empty message="no auth" />;
  }

  const rawData = await getCreditsByUserUuid(user_uuid, 1, 100);

  // 使用公共函数批量增强积分记录
  const data = await enrichCreditsWithResources(rawData || []);

  const userCredits = await getUserCredits(user_uuid);

  const table: TableSlotType = {
    title: t("my_credits.title"),
    tip: {
      title: t("my_credits.left_tip", {
        left_credits: userCredits?.left_credits || 0,
      }),
    },
    toolbar: {
      items: [
        {
          title: t("my_credits.recharge"),
          url: "/#pricing",
          target: "_blank",
        },
      ],
    },
    columns: [
      {
        title: t("my_credits.table.trans_no"),
        name: "trans_no",
      },
      {
        title: t("my_credits.table.trans_type"),
        name: "trans_type",
        callback: (v: any) => {
          const baseText = getTransactionTypeText(v.trans_type);

          // 如果是资源访问且有资源信息，在后面加上资源名称
          if (isResourceAccessTransaction(v.trans_type) && v.resource) {
            const resourceName = truncateResourceTitle(v.resource.title);
            return (
              <span>
                {baseText}--
                <a
                  href={v.resource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                  title={getResourceLinkTitle(v.resource)}
                >
                  {resourceName}
                </a>
              </span>
            );
          }

          return baseText;
        },
      },
      {
        title: t("my_credits.table.credits"),
        name: "credits",
      },
      {
        title: t("my_credits.table.updated_at"),
        name: "created_at",
        callback: (v: any) => {
          return moment(v.created_at).format("YYYY-MM-DD HH:mm:ss");
        },
      },
    ],
    data,
    empty_message: t("my_credits.no_credits"),
  };

  return <TableSlot {...table} />;
}
