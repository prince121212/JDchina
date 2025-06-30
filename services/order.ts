import {
  CreditsTransType,
  increaseCredits,
  updateCreditForOrder,
} from "./credit";
import { findOrderByOrderNo, updateOrderStatus } from "@/models/order";
import { getIsoTimestr, getOneYearLaterTimestr } from "@/lib/time";

import Stripe from "stripe";
import { updateAffiliateForOrder } from "./affiliate";
import { emailService } from "./email";
import { findUserByUuid } from "@/models/user";
import { log } from "@/lib/logger";

export async function handleOrderSession(session: Stripe.Checkout.Session) {
  try {
    if (
      !session ||
      !session.metadata ||
      !session.metadata.order_no ||
      session.payment_status !== "paid"
    ) {
      throw new Error("invalid session");
    }

    const order_no = session.metadata.order_no;
    const paid_email =
      session.customer_details?.email || session.customer_email || "";
    const paid_detail = JSON.stringify(session);

    const order = await findOrderByOrderNo(order_no);
    if (!order || order.status !== "created") {
      throw new Error("invalid order");
    }

    const paid_at = getIsoTimestr();
    await updateOrderStatus(order_no, "paid", paid_at, paid_email, paid_detail);

    if (order.user_uuid) {
      if (order.credits > 0) {
        // increase credits for paied order
        await updateCreditForOrder(order);
      }

      // update affiliate for paied order
      await updateAffiliateForOrder(order);

      // 发送订单确认邮件（非阻塞）
      const emailTo = paid_email || order.user_email || '';
      if (emailTo) {
        // 获取用户信息
        const user = await findUserByUuid(order.user_uuid);

        emailService.sendOrderConfirmationEmail(emailTo, {
          orderNo: order.order_no,
          amount: order.amount / 100, // 转换为元
          credits: order.credits,
          userName: user?.nickname || undefined,
        })
          .then((success) => {
            if (success) {
              log.info("订单确认邮件发送成功", { emailTo, order_no, function: 'handleOrderSession' });
            } else {
              log.warn("订单确认邮件发送失败", { emailTo, order_no, function: 'handleOrderSession' });
            }
          })
          .catch((error) => {
            log.error("订单确认邮件发送异常", error, { emailTo, order_no, function: 'handleOrderSession' });
          });
      }
    }

    log.info("订单处理成功", {
      order_no,
      paid_at,
      paid_email,
      user_uuid: order.user_uuid,
      credits: order.credits,
      function: 'handleOrderSession'
    });
  } catch (e) {
    log.error("handle order session failed", e as Error, { function: 'handleOrderSession' });
    throw e;
  }
}
