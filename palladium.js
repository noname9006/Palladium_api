import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';

// Initialize Discord client
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Track the first timeout occurrence
let firstTimeoutTime = null;

// Function to get formatted UTC timestamp
const getUTCTimestamp = () => {
    const now = new Date();
    return now.toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '');
};

// Function to log with timestamp
const logWithDetails = (message) => {
    console.log(`[${getUTCTimestamp()}] ${message}`);
};

// Function to format numbers with 2 decimal places
const formatNumber = (num) => Number(num).toFixed(2);

// Function to format TCR value and get appropriate template
const formatTCR = (tcr) => {
    const tcrPercentage = tcr * 100;
    const formattedTCR = formatNumber(tcrPercentage);
    
    if (tcr > 2) {
        return process.env.TCR_TEMPLATE_GREEN.replace('{value}', formattedTCR);
    } else if (tcr >= 1.3) {
        return process.env.TCR_TEMPLATE_YELLOW.replace('{value}', formattedTCR);
    } else {
        return process.env.TCR_TEMPLATE_RED.replace('{value}', formattedTCR);
    }
};

// Function to check if we should set to offline
const shouldSetOffline = () => {
    if (!firstTimeoutTime) return false;
    
    const minutesSinceFirstTimeout = (Date.now() - firstTimeoutTime) / (60 * 1000);
    return minutesSinceFirstTimeout >= parseInt(process.env.OFFLINE_TIMEOUT_MINUTES);
};

// Function to reset timeout tracking
const resetTimeoutTracking = () => {
    firstTimeoutTime = null;
};

// Function to set channels to offline values
async function setChannelsOffline() {
    const offlineValue = process.env.OFFLINE_VALUE || '0.00';
    
    try {
        if (process.env.PRICE_PUSD_CHANNEL_ID) {
            const pusdChannel = await client.channels.fetch(process.env.PRICE_PUSD_CHANNEL_ID);
            if (pusdChannel) {
                const offlineName = process.env.PRICE_PUSD_TEMPLATE.replace('{value}', offlineValue);
                try {
                    await pusdChannel.setName(offlineName);
                    logWithDetails(`Changed PUSD channel to offline value: ${offlineName}`);
                } catch (error) {
                    logWithDetails(`Failed to change PUSD channel name: ${error.message}`);
                }
            }
        }

        if (process.env.PRICE_BTC_CHANNEL_ID) {
            const btcChannel = await client.channels.fetch(process.env.PRICE_BTC_CHANNEL_ID);
            if (btcChannel) {
                const offlineName = process.env.PRICE_BTC_TEMPLATE.replace('{value}', offlineValue);
                try {
                    await btcChannel.setName(offlineName);
                    logWithDetails(`Changed BTC channel to offline value: ${offlineName}`);
                } catch (error) {
                    logWithDetails(`Failed to change BTC channel name: ${error.message}`);
                }
            }
        }

        if (process.env.TCR_CHANNEL_ID) {
            const tcrChannel = await client.channels.fetch(process.env.TCR_CHANNEL_ID);
            if (tcrChannel) {
                const offlineName = process.env.TCR_TEMPLATE_RED.replace('{value}', offlineValue);
                try {
                    await tcrChannel.setName(offlineName);
                    logWithDetails(`Changed TCR channel to offline value: ${offlineName}`);
                } catch (error) {
                    logWithDetails(`Failed to change TCR channel name: ${error.message}`);
                }
            }
        }
    } catch (error) {
        logWithDetails(`Error setting channels to offline values: ${error.message}`);
    }
}

// Function to update channel names
async function updateChannels(data) {
    const firstItem = data[0];
    
    try {
        if (process.env.PRICE_PUSD_CHANNEL_ID) {
            const pusdChannel = await client.channels.fetch(process.env.PRICE_PUSD_CHANNEL_ID);
            if (pusdChannel) {
                const oldName = pusdChannel.name;
                const newName = process.env.PRICE_PUSD_TEMPLATE.replace('{value}', formatNumber(firstItem.pricePUSD));
                if (oldName !== newName) {
                    try {
                        await pusdChannel.setName(newName);
                        logWithDetails(`Channel name changed: ${oldName} -> ${newName}`);
                    } catch (error) {
                        logWithDetails(`Failed to change PUSD channel name: ${error.message}`);
                    }
                }
            }
        }

        if (process.env.PRICE_BTC_CHANNEL_ID) {
            const btcChannel = await client.channels.fetch(process.env.PRICE_BTC_CHANNEL_ID);
            if (btcChannel) {
                const oldName = btcChannel.name;
                const newName = process.env.PRICE_BTC_TEMPLATE.replace('{value}', formatNumber(firstItem.priceBTC));
                if (oldName !== newName) {
                    try {
                        await btcChannel.setName(newName);
                        logWithDetails(`Channel name changed: ${oldName} -> ${newName}`);
                    } catch (error) {
                        logWithDetails(`Failed to change BTC channel name: ${error.message}`);
                    }
                }
            }
        }

        if (process.env.TCR_CHANNEL_ID) {
            const tcrChannel = await client.channels.fetch(process.env.TCR_CHANNEL_ID);
            if (tcrChannel) {
                const oldName = tcrChannel.name;
                const newName = formatTCR(firstItem.TCR);
                if (oldName !== newName) {
                    try {
                        await tcrChannel.setName(newName);
                        logWithDetails(`Channel name changed: ${oldName} -> ${newName}`);
                    } catch (error) {
                        logWithDetails(`Failed to change TCR channel name: ${error.message}`);
                    }
                }
            }
        }
    } catch (error) {
        logWithDetails(`Error updating channels: ${error.message}`);
    }
}

// Function to fetch API data with timeout
async function fetchDataWithTimeout(timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(process.env.API_URL, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        logWithDetails('API Response received successfully');
        return data;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Main data fetching function
async function fetchData() {
    const apiTimeoutMinutes = parseInt(process.env.API_TIMEOUT_MINUTES) || 5;
    const apiTimeoutMs = apiTimeoutMinutes * 60 * 1000;

    try {
        logWithDetails('Attempting to fetch API data...');
        const data = await fetchDataWithTimeout(apiTimeoutMs);
        resetTimeoutTracking(); // Reset timeout tracking on successful response
        await updateChannels(data);
    } catch (error) {
        logWithDetails(`API Error: ${error.message}`);
        
        // If this is the first timeout, record the time
        if (!firstTimeoutTime) {
            firstTimeoutTime = Date.now();
            logWithDetails('First API timeout occurred. Starting offline countdown.');
        }

        // Check if we should set to offline
        if (shouldSetOffline()) {
            logWithDetails('Offline timeout period exceeded. Setting channels to offline values...');
            await setChannelsOffline();
        } else {
            const minutesRemaining = parseInt(process.env.OFFLINE_TIMEOUT_MINUTES) - 
                ((Date.now() - firstTimeoutTime) / (60 * 1000));
            logWithDetails(`No response from API. ${minutesRemaining.toFixed(2)} minutes remaining until offline state.`);
        }
    }
}

// Bot event handlers
client.once('ready', () => {
    logWithDetails(`Bot is ready! Logged in as ${client.user.tag}`);
    fetchData(); // Initial fetch
    setInterval(fetchData, parseInt(process.env.UPDATE_INTERVAL));
});

client.on('disconnect', () => {
    logWithDetails('Bot disconnected! Attempting to reconnect...');
    client.login(process.env.DISCORD_TOKEN).catch(error => 
        logWithDetails(`Reconnection failed: ${error.message}`)
    );
});

client.on('error', error => {
    logWithDetails(`Discord client error: ${error.message}`);
});

client.on('warn', info => {
    logWithDetails(`Discord client warning: ${info}`);
});

client.on('rateLimit', (rateLimitInfo) => {
    logWithDetails(`Rate limit hit: Timeout: ${rateLimitInfo.timeout}, Limit: ${rateLimitInfo.limit}, Method: ${rateLimitInfo.method}, Path: ${rateLimitInfo.path}`);
});

// Validate token and start the bot
if (!process.env.DISCORD_TOKEN) {
    logWithDetails('Discord token is not provided in environment variables!');
    process.exit(1);
}

// Start the bot
client.login(process.env.DISCORD_TOKEN).catch(error => {
    logWithDetails(`Failed to login: ${error.message}`);
    process.exit(1);
});