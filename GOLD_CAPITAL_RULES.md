# TG Trading — Gold Capital Rules (Initial)

## Confirmed initial rule

For the private gold MVP, every **1 tael** purchase requires a **USD 1,000
allocated deposit**.

This is the product’s capital-allocation rule. It is not assumed to be the
broker’s official margin requirement; broker margin, contract size, leverage,
spread, commissions, financing, and liquidation rules must still be recorded
from the actual broker account.

## Product behaviour

| Requested gold amount | Required allocated deposit | Product action |
| --- | ---: | --- |
| 1 tael | USD 1,000 | Allow the trade plan if all risk rules pass |
| 2 tael | USD 2,000 | Require USD 2,000 available allocation and re-check total risk |
| N tael | USD 1,000 × N | Require the full calculated allocation before the plan can be approved |

The dashboard must distinguish:

- **Account cash/equity:** actual money held with the broker or available to trade.
- **Allocated deposit:** USD 1,000 multiplied by the planned/held tael quantity.
- **Broker-required margin:** actual margin reported by the broker, if available.
- **Free capital:** account equity minus allocated deposit, broker margin reserve,
  and any configured safety buffer—using the stricter applicable rule.
- **Risk at stop loss:** the estimated loss if the stop loss is reached; this is
  separate from the USD 1,000 allocation.

## Gold order-plan checks

Before a gold trade plan can be approved, TG Trading must verify:

1. Tael quantity is a positive permitted increment.
2. Allocated deposit equals `tael quantity × USD 1,000`.
3. Actual account equity can cover allocated deposit plus any broker margin/safety buffer.
4. A stop loss is entered and the loss at that price is within the configured
   per-trade risk cap.
5. The new position does not breach daily loss, weekly warning, or maximum
   drawdown limits.
6. The tael-to-broker-contract conversion is confirmed in settings before any
   calculation is relied upon.

## UI updates

### Gold order planner

Display these fields together, in this order:

1. Quantity: `[ 1 ] tael`
2. Required allocation: `USD 1,000`
3. Entry / stop loss / target price
4. Estimated loss at stop loss
5. Broker margin (if connected)
6. Remaining free capital after approval

The primary action reads **Review gold plan**. The confirmation screen repeats
the quantity, required allocation, maximum estimated loss, and the fact that
execution occurs with the selected broker.

### Portfolio

Show gold exposure as both `tael` and the equivalent broker contract quantity.
Never infer that USD 1,000 is profit potential or guaranteed collateral value.

## Required configuration

Before we implement calculations, enter these verified values from the broker:

- The physical weight represented by the selected local **tael** unit.
- The XAU/USD contract size, minimum lot, price decimal/tick size, and tick value.
- The conversion between one tael and broker lot/contract quantity.
- Account currency, leverage, initial/maintenance margin rules, spread,
  commission, and overnight financing.
- Starting capital and the maximum permissible risk per trade, daily loss,
  weekly loss warning, and maximum drawdown.

Without this configuration, the app can still enforce the USD 1,000-per-tael
allocation rule, but it must label broker margin and loss projections as
unavailable rather than guess them.
