# Arbitrum SDK Example
## Config Environment Variables
```bash
# Install dependencies
npm i

# Create `.env`
cp .env.sample .env

# Enter Parent & Child Provider Info
PARENT_CHAIN_URL=
CHILD_CHAIN_URL=

PARENT_CHAIN_WS_URL=
CHILD_CHAIN_WS_URL=
```

## Custom System Contract
If want to custom system contract address, set [network/l2l3network.json](network/l2l3network.json) file