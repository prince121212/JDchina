import {
  findCreditByOrderNo,
  getUserValidCredits,
  insertCredit,
} from "@/models/credit";

import { Credit } from "@/types/credit";
import { Order } from "@/types/order";
import { UserCredits } from "@/types/user";
import { findUserByUuid } from "@/models/user";
import { getFirstPaidOrderByUserUuid } from "@/models/order";
import { getIsoTimestr } from "@/lib/time";
import { getSnowId } from "@/lib/hash";
import { log } from "@/lib/logger";

export enum CreditsTransType {
  NewUser = "new_user", // initial credits for new user
  OrderPay = "order_pay", // user pay for credits
  SystemAdd = "system_add", // system add credits
  Ping = "ping", // cost for ping api
  ResourceAccess = "resource_access", // cost for accessing paid resources
}

export enum CreditsAmount {
  NewUserGet = 10,
  PingCost = 1,
}

export async function getUserCredits(user_uuid: string): Promise<UserCredits> {
  let user_credits: UserCredits = {
    left_credits: 0,
  };

  try {
    log.debug("开始获取用户积分", { user_uuid, function: 'getUserCredits' });

    const first_paid_order = await getFirstPaidOrderByUserUuid(user_uuid);
    if (first_paid_order) {
      user_credits.is_recharged = true;
      log.debug("用户已充值", { user_uuid, function: 'getUserCredits' });
    }

    const credits = await getUserValidCredits(user_uuid);
    log.debug("获取有效积分记录", {
      user_uuid,
      creditsCount: credits?.length || 0,
      function: 'getUserCredits'
    });

    if (credits) {
      credits.forEach((v: Credit) => {
        user_credits.left_credits += v.credits;
      });
    }

    if (user_credits.left_credits < 0) {
      user_credits.left_credits = 0;
    }

    if (user_credits.left_credits > 0) {
      user_credits.is_pro = true;
    }

    log.info("积分计算完成", {
      user_uuid,
      left_credits: user_credits.left_credits,
      is_pro: user_credits.is_pro,
      is_recharged: user_credits.is_recharged,
      function: 'getUserCredits'
    });
    return user_credits;
  } catch (e) {
    log.error("获取用户积分失败", e as Error, { user_uuid, function: 'getUserCredits' });
    return user_credits;
  }
}

export async function decreaseCredits({
  user_uuid,
  trans_type,
  credits,
  order_no: custom_order_no,
}: {
  user_uuid: string;
  trans_type: CreditsTransType;
  credits: number;
  order_no?: string;
}) {
  try {
    let order_no = custom_order_no || "";
    let expired_at: string | null = null;
    let left_credits = 0;

    const userCredits = await getUserValidCredits(user_uuid);
    if (userCredits) {
      for (let i = 0, l = userCredits.length; i < l; i++) {
        const credit = userCredits[i];
        left_credits += credit.credits;

        // credit enough for cost
        if (left_credits >= credits) {
          // 如果没有自定义order_no，使用被扣除积分的order_no
          if (!custom_order_no) {
            order_no = credit.order_no;
          }
          expired_at = credit.expired_at || null;
          break;
        }

        // look for next credit
      }
    }

    const new_credit: Omit<Credit, 'id'> = {
      trans_no: getSnowId(),
      created_at: getIsoTimestr(),
      user_uuid: user_uuid,
      trans_type: trans_type,
      credits: 0 - credits,
      order_no: order_no,
      expired_at: expired_at,
    };
    await insertCredit(new_credit);
  } catch (e) {
    log.error("扣减积分失败", e as Error, { user_uuid, trans_type, credits, function: 'decreaseCredits' });
    throw e;
  }
}

export async function increaseCredits({
  user_uuid,
  trans_type,
  credits,
  expired_at,
  order_no,
}: {
  user_uuid: string;
  trans_type: string;
  credits: number;
  expired_at?: string;
  order_no?: string;
}) {
  try {
    const new_credit: Omit<Credit, 'id'> = {
      trans_no: getSnowId(),
      created_at: getIsoTimestr(),
      user_uuid: user_uuid,
      trans_type: trans_type,
      credits: credits,
      order_no: order_no || "",
      expired_at: expired_at || null,
    };
    await insertCredit(new_credit);
  } catch (e) {
    log.error("增加积分失败", e as Error, { user_uuid, trans_type, credits, function: 'increaseCredits' });
    throw e;
  }
}

export async function updateCreditForOrder(order: Order) {
  try {
    const credit = await findCreditByOrderNo(order.order_no);
    if (credit) {
      // order already increased credit
      return;
    }

    await increaseCredits({
      user_uuid: order.user_uuid,
      trans_type: CreditsTransType.OrderPay,
      credits: order.credits,
      expired_at: order.expired_at,
      order_no: order.order_no,
    });
  } catch (e) {
    log.error("更新订单积分失败", e as Error, {
      order_no: order.order_no,
      user_uuid: order.user_uuid,
      credits: order.credits,
      function: 'updateCreditForOrder'
    });
    throw e;
  }
}
