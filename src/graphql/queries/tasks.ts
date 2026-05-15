import { gql } from '@apollo/client'

export const TASKS_QUERY = gql`
  query GetTasks {
    tasks {
      id
      title
      status
      dueDate
      assignee
    }
  }
`
