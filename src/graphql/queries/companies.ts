import { gql } from '@apollo/client'

export const COMPANIES_QUERY = gql`
  query GetCompanies {
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
