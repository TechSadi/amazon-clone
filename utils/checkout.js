import { getDeliveryOption } from "../data/deliveryOptions.js";

export function getSubtotal(cart) {
   const subtotal =  cart.items.reduce((total, item) => {
        return total + (
            item.product.priceCents * item.quantity
        );
   }, 0);
    
    return subtotal;
    
}

export function getTotalShippingCost(cart) {
    const totalShippingCost = cart.items.reduce((total, item) => {
        return total + (
            getDeliveryOption(item.deliveryOptionId).priceCents
        );
    }, 0);

    return totalShippingCost;
}
