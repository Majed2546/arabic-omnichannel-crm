import { gql } from '@apollo/client'

export const OPPORTUNITIES_QUERY = gql`
  query GetOpportunities {
    opportunities {
      id
      name
      status
      stage
      amount
      closeDate
    }
  }
`
