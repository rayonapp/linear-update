# Linear update

Add description to ticket

## Usage

```yaml
      - name: Sync linear tickets
        uses: rayonapp/linear-update@main
        continue-on-error: true
        with:
            token: ${{ secrets.GITHUB_TOKEN }}
            linearApiKey: ${{ secrets.LINEAR_API_KEY }}
            comment: ${{ steps.comment.comment }}
            ticketPrefix: RAY
```
