import * as core from '@actions/core'
import * as github from '@actions/github'
import { LinearClient } from '@linear/sdk'

export async function run(): Promise<void> {
  try {
    const token: string = core.getInput('token')
    const apiKey: string = core.getInput('linearApiKey')
    const ticketPrefix: string = core.getInput('ticketPrefix')
    const comment: string = core.getInput('comment')

    const linearClient = new LinearClient({ apiKey })

    const octokit = github.getOctokit(token)

    const currentPrNumber = github.context.payload.pull_request?.number
    if (!currentPrNumber) {
      throw new Error('Cannot retrieve PR number')
    }

    console.log(`Getting comment from PR #${currentPrNumber}`)
    const comments = await octokit.rest.issues.listComments({
      ...github.context.repo,
      issue_number: currentPrNumber
    })
    const linearComment = comments.data.find(
      c => c.performed_via_github_app?.name === 'Linear'
    )
    const ticketRef = linearComment?.body?.match(
      new RegExp(`\\b${ticketPrefix}-\\d+\\b`) // eslint-disable-line no-useless-escape
    )?.[0]
    if (!ticketRef) {
      throw new Error('Cannot retrieve ticket ref from PR comments')
    }
    console.log(`Found ticket ref ${ticketRef}`)

    const initThreadBody = 'App previews \n'
    const linearTicket = await linearClient.issue(ticketRef)
    console.log('Ticket found')
    const currentComments = await linearClient.comments({
      filter: {
        body: {
          startsWith: initThreadBody
        },
        issue: {
          id: {
            eq: linearTicket.id
          }
        }
      }
    })
    console.log('Comments found')
    let previewParentComment = currentComments.nodes[0]
    if (!previewParentComment) {
      console.log('Preview comment no found, creating it')
      previewParentComment = await (
        await linearClient.createComment({
          body: initThreadBody,
          issueId: linearTicket.id,
          doNotSubscribeToIssue: true
        })
      ).comment!
      console.log(`Preview comment created #${previewParentComment?.id}`)
    } else {
      console.log(`Preview comment found #${previewParentComment.id}`)
    }
    await linearClient.updateComment(previewParentComment.id, {
      body: `${previewParentComment.body}\n${comment}`
    })

    console.log('Comment added!')
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
