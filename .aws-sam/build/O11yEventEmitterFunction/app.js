const axios = require('axios')
const o11yUrl = process.env.REALM ? `https://ingest.${process.env.REALM}.signalfx.com/v2/event` : 'default-url'
const o11yToken = process.env.ACCESS_TOKEN ? process.env.ACCESS_TOKEN : 'default-token'
const headers = {
    'Content-Type': 'application/json',
    'X-SF-Token': o11yToken
}
let result;

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
exports.lambdaHandler = async (event, context) => {
    const parsed = parseSnsEvent(event)

    // O11y Event payloads are a list of discrete events, thus the list of a single element here
    const o11yEvent = [{
        category: 'USER_DEFINED',
        eventType: 'TSJ CI-CD Pipeline Event',
        dimensions: {
            pipeline: parsed.detail.pipeline,
            stage: parsed.detail.stage,
            action: parsed.detail.action,
            state: parsed.detail.state
        },
        properties: {
            fooProp: 'bar'
        }
    }]

    const requestConfig = {
        url: o11yUrl,
        method: 'POST',
        data: o11yEvent,
        headers: headers
    }

    await axios.request(requestConfig)
        .then(function (response) {
            result = {
                statusCode: response.status,
                statusText: response.statusText,
                body: response.data
            }
            console.log(`Successfully sent event to Observability Cloud: ${JSON.stringify(result)}`)
        }).catch(function (error) {
            result = {
                statusCode: error.response.status,
                statusText: error.response.statusText,
                requestConfig: error.response.config
            }
            console.error(`Error sending event to Observability Cloud: ${JSON.stringify(result)}`)
        });
    return JSON.stringify(result)
};

function parseSnsEvent(event) {
    let result = {}
    const record = event['Records'][0]
    const message = record['Sns']['Message']
    result = JSON.parse(message)
    return result
}