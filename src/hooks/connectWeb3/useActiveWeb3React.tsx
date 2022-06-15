import { ExternalProvider, JsonRpcProvider, Web3Provider } from '@ethersproject/providers'
import { getPriorityConnector, initializeConnector, Web3ReactHooks } from '@web3-react/core'
import { EIP1193 } from '@web3-react/eip1193'
import { EMPTY } from '@web3-react/empty'
import { Connector, Provider as Eip1193Provider } from '@web3-react/types'
import { Url } from '@web3-react/url'
import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import JsonRpcConnector from 'utils/JsonRpcConnector'

import { connections } from './useConnect'

export type Web3ContextType = {
  connector: Connector
  library?: (JsonRpcProvider & { provider?: ExternalProvider }) | Web3Provider
  chainId?: ReturnType<Web3ReactHooks['useChainId']>
  accounts?: ReturnType<Web3ReactHooks['useAccounts']>
  account?: ReturnType<Web3ReactHooks['useAccount']>
  // TODO(kristiehuang): clarify - `active` currently describes both an active RPC network connection or active wallet connection
  // We want active = true iff active wallet connection. Maybe set new `networkActive` prop iff active network connection?
  active?: ReturnType<Web3ReactHooks['useIsActive']>
  activating?: ReturnType<Web3ReactHooks['useIsActivating']>
  error?: ReturnType<Web3ReactHooks['useError']>
}

const [EMPTY_CONNECTOR, EMPTY_HOOKS] = initializeConnector<Connector>(() => EMPTY)
const EMPTY_STATE = { connector: EMPTY_CONNECTOR, hooks: EMPTY_HOOKS }
const EMPTY_CONTEXT: Web3ContextType = { connector: EMPTY }
export const Web3Context = createContext(EMPTY_CONTEXT)

export default function useActiveWeb3React() {
  return useContext(Web3Context)
}

export function getNetwork(jsonRpcEndpoint?: string | JsonRpcProvider) {
  if (jsonRpcEndpoint) {
    let connector, hooks
    if (JsonRpcProvider.isProvider(jsonRpcEndpoint)) {
      ;[connector, hooks] = initializeConnector((actions) => new JsonRpcConnector(actions, jsonRpcEndpoint))
    } else {
      ;[connector, hooks] = initializeConnector((actions) => new Url(actions, jsonRpcEndpoint))
    }
    connector.activate()
    return { connector, hooks }
  }
  return EMPTY_STATE
}

function getWallet(provider?: JsonRpcProvider | Eip1193Provider) {
  if (provider) {
    let connector, hooks
    if (JsonRpcProvider.isProvider(provider)) {
      ;[connector, hooks] = initializeConnector((actions) => new JsonRpcConnector(actions, provider))
    } else if (JsonRpcProvider.isProvider((provider as any).provider)) {
      throw new Error('Eip1193Bridge is experimental: pass your ethers Provider directly')
    } else {
      ;[connector, hooks] = initializeConnector((actions) => new EIP1193(actions, provider))
    }
    connector.activate()
    return { connector, hooks }
  }
  return EMPTY_STATE
}

export function useActiveProvider(): Web3Provider | undefined {
  const activeWalletProvider = getPriorityConnector(...connections).usePriorityProvider() as Web3Provider
  const { connector: network } = getNetwork() // Return network-only provider if no wallet is connected
  return activeWalletProvider ?? network.provider
}

interface ActiveWeb3ProviderProps {
  jsonRpcEndpoint?: string | JsonRpcProvider
  provider?: Eip1193Provider | JsonRpcProvider
}

export function ActiveWeb3Provider({
  jsonRpcEndpoint,
  provider,
  children,
}: PropsWithChildren<ActiveWeb3ProviderProps>) {
  const network = useMemo(() => getNetwork(jsonRpcEndpoint), [jsonRpcEndpoint])
  const wallet = useMemo(() => getWallet(provider), [provider])

  const { connector, hooks } = wallet.hooks.useIsActive() ? wallet : network
  const accounts = hooks.useAccounts()
  const account = hooks.useAccount()
  const activating = hooks.useIsActivating()
  const active = hooks.useIsActive()
  const chainId = hooks.useChainId()
  const error = hooks.useError()
  const library = hooks.useProvider()
  const web3 = useMemo(() => {
    if (connector === EMPTY || !(active || activating)) {
      return EMPTY_CONTEXT
    }
    return { connector, library, chainId, accounts, account, active, activating, error }
  }, [account, accounts, activating, active, chainId, connector, error, library])

  // Log web3 errors to facilitate debugging.
  useEffect(() => {
    if (error) {
      console.error('web3 error:', error)
    }
  }, [error])

  return <Web3Context.Provider value={web3}>{children}</Web3Context.Provider>
}
