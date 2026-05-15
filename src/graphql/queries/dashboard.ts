import { gql } from '@apollo/client'

export const DASHBOARD_OVERVIEW_QUERY = gql`
  query GetDashboardOverview {
    companies {
      edges {
        node {
          id
          name
          domainName {
            primaryLinkUrl
          }
          employees
          createdAt
        }
      }
    }
  }
`
