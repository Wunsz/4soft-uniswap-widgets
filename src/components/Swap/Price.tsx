import { useLingui } from '@lingui/react'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import Row from 'components/Row'
import { useCallback, useMemo, useState } from 'react'
import { InterfaceTrade } from 'state/routing/types'
import { ThemedText } from 'theme'
import { formatCurrencyAmount, formatPrice } from 'utils/formatCurrencyAmount'

import { TextButton } from '../Button'

interface PriceProps {
  trade: InterfaceTrade
  outputUSDC?: CurrencyAmount<Currency>
}

/** Displays the price of a trade. If outputUSDC is included, also displays the unit price. */
export default function Price({ trade, outputUSDC }: PriceProps) {
  const { i18n } = useLingui()
  const { inputAmount, outputAmount, executionPrice } = trade

  const [base, setBase] = useState<'input' | 'output'>('input')
  const onClick = useCallback(() => setBase((base) => (base === 'input' ? 'output' : 'input')), [])

  // Compute the usdc price from the output price, so that it aligns with the displayed price.
  const { price, usdcPrice } = useMemo(() => {
    switch (base) {
      case 'input':
        return {
          price: executionPrice,
          usdcPrice: outputUSDC?.multiply(inputAmount.decimalScale).divide(inputAmount),
        }
      case 'output':
        return {
          price: executionPrice.invert(),
          usdcPrice: outputUSDC?.multiply(outputAmount.decimalScale).divide(outputAmount),
        }
    }
  }, [base, executionPrice, inputAmount, outputAmount, outputUSDC])

  return (
    <TextButton color="primary" onClick={onClick}>
      <ThemedText.Caption>
        <Row gap={0.25}>
          {1} {price.baseCurrency.symbol} = {formatPrice(price)} {price.quoteCurrency.symbol}
          {usdcPrice && (
            <ThemedText.Caption color="secondary">({formatCurrencyAmount(usdcPrice, true)})</ThemedText.Caption>
          )}
        </Row>
      </ThemedText.Caption>
    </TextButton>
  )
}
