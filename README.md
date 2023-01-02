# Setup IAM Live

This Github action installs [iamlive][] and allows to capture the used AWS IAM permissions using client-side monitoring (CSM).

## Usage

### Install only

Only installs `iamlive`

```yaml
env:
  AWS_CSM_ENABLED: 'true'

steps:
  - uses: marcofranssen/setup-iamlive@v0.2.2
    with:
      iamlive-version: v0.50.0
  - run: ./iamlive --background --sort-alphabetical --output-file iamlive-policy.json
  - run: |
      aws s3 mb s3://test-bucket
      aws s3 ls
  - if: ${{ always() }}
    run: |
      echo "Waiting 60 secs for iamlive to process all the permissions"
      sleep 60
      while ps -ef | grep iamlive | grep -v grep
      do
        kill -s SIGTERM `ps -ef | grep iamlive | grep -v grep | awk '{print $2}'`
        sleep 1
      done
      cat iamlive-policy.json
  - if: ${{ always() }}
    uses: actions/upload-artifact@v3
    with:
      name: iamlive-policy.json
      path: iamlive-policy.json
```

### Autocapture

Starts `iamlive` automatically in the background and uses the post execution step to shutdown `iamlive` and upload the policy document.

```yaml
env:
  AWS_CSM_ENABLED: 'true'

steps:
  - uses: marcofranssen/setup-iamlive@v0.2.2
    with:
      iamlive-version: v0.50.0
      auto-capture: true
      output-file: iamlive-policy.json
  - run: aws s3 ls
```

[iamlive]: https://github.com/iann0036/iamlive "Generate an IAM policy from AWS calls using client-side monitoring (CSM) or embedded proxy"
