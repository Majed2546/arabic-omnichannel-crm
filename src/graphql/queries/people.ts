import { gql } from '@apollo/client'

export const PEOPLE_QUERY = gql`
  query GetPeople {
    people {
      edges {
        node {
          id
          name {
            firstName
            lastName
          }
          emails {
            primaryEmail
          }
          createdAt
        }
      }
    }
  }
`
