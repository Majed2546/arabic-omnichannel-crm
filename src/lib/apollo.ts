import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from '@apollo/client'
import { GRAPHQL_API_URL, IS_DEVELOPMENT, getGraphqlAuthToken, hasTwentyApiKey } from './apiConfig'
import { createTenantHeaders, getCurrentTenantId } from '../tenants/tenantUtils'

if (IS_DEVELOPMENT) {
  console.info('[GraphQL] URL:', GRAPHQL_API_URL)
  console.info('[GraphQL] Twenty API key exists:', hasTwentyApiKey())
}

const httpLink = new HttpLink({ uri: GRAPHQL_API_URL })

const authLink = new ApolloLink((operation, forward) => {
  const token = getGraphqlAuthToken()
  const tenantId = getCurrentTenantId()

  operation.setContext(({ headers = {} }) => ({
    tenantId,
    tenant_id: tenantId,
    headers: {
      ...headers,
      ...createTenantHeaders(tenantId),
      ...(token
        ? {
            authorization: `Bearer ${token}`,
            'x-api-key': token,
          }
        : {}),
    },
  }))

  return forward(operation)
})

const graphqlLoggerLink = new ApolloLink((operation, forward) =>
  new Observable((observer) => {
    const subscription = forward(operation).subscribe({
      next: (result) => {
        if (IS_DEVELOPMENT && result.errors?.length) {
          console.groupCollapsed(`[GraphQL] ${operation.operationName || 'UnnamedOperation'} returned errors`)
          console.error('Endpoint:', GRAPHQL_API_URL)
          console.error('Variables:', operation.variables)
          console.error('Messages:', result.errors.map((error) => error.message))
          console.error('Errors:', result.errors)
          console.groupEnd()
        }

        observer.next(result)
      },
      error: (error: unknown) => {
        if (IS_DEVELOPMENT) {
          console.groupCollapsed(`[GraphQL] ${operation.operationName || 'UnnamedOperation'} failed`)
          console.error('Endpoint:', GRAPHQL_API_URL)
          console.error('Variables:', operation.variables)
          console.error('Error:', error)
          console.groupEnd()
        }
        observer.error(error)
      },
      complete: () => observer.complete(),
    })

    return () => subscription.unsubscribe()
  }),
)

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([authLink, graphqlLoggerLink, httpLink]),
})
