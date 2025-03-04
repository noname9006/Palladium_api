// Convert everything to CommonJS but handle node-fetch differently
require('dotenv/config');
const { Client, GatewayIntentBits } = require('discord.js');

// Use dynamic import for node-fetch (works with ESM-only modules in CommonJS)
const fetchModule = import('node-fetch').then(module => module.default);

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

// Function to format price numbers without decimals
const formatPriceNumber = (num) => Math.round(Number(num)).toString();

// Function to format TVL in millions with 2 decimal places
const formatTVL = (tvl) => {
    // Convert to millions and keep 2 decimal places
    const tvlInMillions = (tvl / 1000000).toFixed(2);
    return tvlInMillions;
};

// Function to format PUSD supply in millions with 2 decimal places
const formatPUSDSupply = (supply) => {
    // Convert to millions and keep 2 decimal places
    const supplyInMillions = (supply / 1000000).toFixed(2);
    return supplyInMillions;
};

// Function to format TCR value with 2 decimal places and get appropriate template
const formatTCR = (tcr) => {
    const tcrPercentage = tcr * 100;
    // Keep 2 decimal places for TCR
    const formattedTCR = Number(tcrPercentage).toFixed(2);
    
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

// Function to check channels
async function checkChannels() {
    try {
        logWithDetails('Checking channel access...');
        
        if (process.env.PRICE_PUSD_CHANNEL_ID) {
            try {
                const channel = await client.channels.fetch(process.env.PRICE_PUSD_CHANNEL_ID);
                logWithDetails(`PUSD channel found: ${channel.name}`);
            } catch (error) {
                logWithDetails(`Failed to access PUSD channel: ${error.message}`);
            }
        } else {
            logWithDetails('PRICE_PUSD_CHANNEL_ID not set in environment variables');
        }
        
        if (process.env.PRICE_BTC_CHANNEL_ID) {
            try {
                const channel = await client.channels.fetch(process.env.PRICE_BTC_CHANNEL_ID);
                logWithDetails(`BTC channel found: ${channel.name}`);
            } catch (error) {
                logWithDetails(`Failed to access BTC channel: ${error.message}`);
            }
        } else {
            logWithDetails('PRICE_BTC_CHANNEL_ID not set in environment variables');
        }
        
        if (process.env.TCR_CHANNEL_ID) {
            try {
                const channel = await client.channels.fetch(process.env.TCR_CHANNEL_ID);
                logWithDetails(`TCR channel found: ${channel.name}`);
            } catch (error) {
                logWithDetails(`Failed to access TCR channel: ${error.message}`);
            }
        } else {
            logWithDetails('TCR_CHANNEL_ID not set in environment variables');
        }
        
        if (process.env.TVL_CHANNEL_ID) {
            try {
                const channel = await client.channels.fetch(process.env.TVL_CHANNEL_ID);
                logWithDetails(`TVL channel found: ${channel.name}`);
            } catch (error) {
                logWithDetails(`Failed to access TVL channel: ${error.message}`);
            }
        } else {
            logWithDetails('TVL_CHANNEL_ID not set in environment variables');
        }
        
        // Check the new PUSD Supply channel
        if (process.env.PUSD_SUPPLY_ID) {
            try {
                const channel = await client.channels.fetch(process.env.PUSD_SUPPLY_ID);
                logWithDetails(`PUSD Supply channel found: ${channel.name}`);
            } catch (error) {
                logWithDetails(`Failed to access PUSD Supply channel: ${error.message}`);
            }
        } else {
            logWithDetails('PUSD_SUPPLY_ID not set in environment variables');
        }
        
        logWithDetails('Channel check completed');
    } catch (error) {
        logWithDetails(`Error during channel check: ${error.message}`);
    }
}

// Function to test channel update
async function testChannelUpdate() {
    try {
        if (process.env.TVL_CHANNEL_ID) {
            const channel = await client.channels.fetch(process.env.TVL_CHANNEL_ID);
            if (channel) {
                const testName = process.env.TVL_TEMPLATE.replace('{value}', '123.45');
                logWithDetails(`Testing channel update with name: ${testName}`);
                await channel.setName(testName);
                logWithDetails('Test channel update successful');
            }
        }
    } catch (error) {
        logWithDetails(`Test channel update failed: ${error.message}`);
        logWithDetails(`Error stack: ${error.stack}`);
    }
}

// Function to set channels to offline values
async function setChannelsOffline() {
    const offlinePriceValue = process.env.OFFLINE_PRICE_VALUE || '0';
    const offlineTcrValue = process.env.OFFLINE_TCR_VALUE || '0.00';
    const offlineTvlValue = process.env.OFFLINE_TVL_VALUE || '0.00';
    const offlineSupplyValue = process.env.OFFLINE_SUPPLY_VALUE || '0.00';
    
    try {
        logWithDetails('Setting channels to offline values...');
        if (process.env.PRICE_PUSD_CHANNEL_ID) {
            const pusdChannel = await client.channels.fetch(process.env.PRICE_PUSD_CHANNEL_ID);
            if (pusdChannel) {
                const offlineName = process.env.PRICE_PUSD_TEMPLATE.replace('{value}', offlinePriceValue);
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
                const offlineName = process.env.PRICE_BTC_TEMPLATE.replace('{value}', offlinePriceValue);
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
                const offlineName = process.env.TCR_TEMPLATE_RED.replace('{value}', offlineTcrValue);
                try {
                    await tcrChannel.setName(offlineName);
                    logWithDetails(`Changed TCR channel to offline value: ${offlineName}`);
                } catch (error) {
                    logWithDetails(`Failed to change TCR channel name: ${error.message}`);
                }
            }
        }
        
        // Add TVL channel to offline mode
        if (process.env.TVL_CHANNEL_ID) {
            const tvlChannel = await client.channels.fetch(process.env.TVL_CHANNEL_ID);
            if (tvlChannel) {
                const offlineName = process.env.TVL_TEMPLATE.replace('{value}', offlineTvlValue);
                try {
                    await tvlChannel.setName(offlineName);
                    logWithDetails(`Changed TVL channel to offline value: ${offlineName}`);
                } catch (error) {
                    logWithDetails(`Failed to change TVL channel name: ${error.message}`);
                }
            }
        }

        // Set PUSD Supply channel to offline mode
        if (process.env.PUSD_SUPPLY_ID) {
            const pusdSupplyChannel = await client.channels.fetch(process.env.PUSD_SUPPLY_ID);
            if (pusdSupplyChannel) {
                const offlineName = process.env.PUSD_SUPPLY_TEMPLATE.replace('{value}', offlineSupplyValue);
                try {
                    await pusdSupplyChannel.setName(offlineName);
                    logWithDetails(`Changed PUSD Supply channel to offline value: ${offlineName}`);
                } catch (error) {
                    logWithDetails(`Failed to change PUSD Supply channel name: ${error.message}`);
                }
            }
        }
        
        logWithDetails('Finished setting channels to offline values');
    } catch (error) {
        logWithDetails(`Error setting channels to offline values: ${error.message}`);
        logWithDetails(`Error stack: ${error.stack}`);
    }
}

// Function to fetch PUSD token quantity from second API
async function fetchPUSDQuantity() {
    try {
        if (!process.env.API_PUSD_URL) {
            logWithDetails('API_PUSD_URL not set in environment variables');
            return 0;
        }
        
        logWithDetails('Fetching PUSD data from second API...');
        const fetch = await fetchModule;
        const response = await fetch(process.env.API_PUSD_URL);
        
        if (!response.ok) {
            throw new Error(`PUSD API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        logWithDetails('PUSD API response received successfully');
        
        // Find the PUSD token entry
        const pusdToken = data.items.find(item => 
            item.tokenAddress === "0xe19cE0aCF70DBD7ff9Cb80715f84aB0Fd72B57AC"
        );
        
        if (!pusdToken) {
            logWithDetails('PUSD token not found in API response');
            return 0;
        }
        
        // Get the token quantity and decimals
        const tokenQuantity = pusdToken.tokenQuantity;
        const tokenDecimals = parseInt(pusdToken.tokenDecimals);
        
        // Convert the quantity to a number without decimals
        const actualQuantity = Number(tokenQuantity) / Math.pow(10, tokenDecimals);
        
        logWithDetails(`PUSD token found. Raw quantity: ${tokenQuantity}, Decimals: ${tokenDecimals}, Actual quantity: ${actualQuantity}`);
        return actualQuantity;
        
    } catch (error) {
        logWithDetails(`Error fetching PUSD data: ${error.message}`);
        return 0;
    }
}

// Function to calculate PUSD supply by summing the totaldebt values from the metrics
function calculatePUSDSupply(data) {
    logWithDetails('Calculating PUSD Supply...');
    let totalSupply = 0;
    
    try {
        // Get the metrics array from the first item
        const metrics = data[0].metrics;
        
        // Sum up totaldebt for each token metric
        for (const metric of metrics) {
            if (metric.totaldebt) {
                const debtValue = parseFloat(metric.totaldebt);
                totalSupply += debtValue;
                logWithDetails(`Token: ${metric.token}, Total Debt: ${debtValue}`);
            }
        }
        
        logWithDetails(`Total calculated PUSD Supply: ${totalSupply}`);
        return totalSupply;
    } catch (error) {
        logWithDetails(`Error calculating PUSD Supply: ${error.message}`);
        return 0;
    }
}

// Function to calculate TVL from metrics data and PUSD quantity
async function calculateTVL(data) {
    logWithDetails('Calculating TVL...');
    let tvlTotal = 0;
    
    try {
        // Get the metrics array from the first item
        const metrics = data[0].metrics;
        
        // Sum up price * totalcoll for each token
        for (const metric of metrics) {
            const tokenPrice = parseFloat(metric.price);
            const tokenColl = parseFloat(metric.totalcoll);
            const tokenTVL = tokenPrice * tokenColl;
            tvlTotal += tokenTVL;
            logWithDetails(`Token: ${metric.token}, Price: ${tokenPrice}, Collateral: ${tokenColl}, TVL: ${tokenTVL}`);
        }
        
        // Fetch and add PUSD quantity to TVL
        const pusdQuantity = await fetchPUSDQuantity();
        tvlTotal += pusdQuantity;
        
        logWithDetails(`Collateral TVL: ${tvlTotal - pusdQuantity}`);
        logWithDetails(`PUSD Quantity: ${pusdQuantity}`);
        logWithDetails(`Total calculated TVL: ${tvlTotal}`);
        return tvlTotal;
    } catch (error) {
        logWithDetails(`Error calculating TVL: ${error.message}`);
        return 0;
    }
}

// Function to update channel names
async function updateChannels(data) {
    try {
        logWithDetails('Starting channel updates...');
        logWithDetails(`Data received: ${JSON.stringify(data)}`);
        
        const firstItem = data[0];
        // Get the first metric (wBTC data)
        const firstMetric = firstItem.metrics[0];
        logWithDetails(`Processing first metric: ${JSON.stringify(firstMetric)}`);
        
        if (process.env.PRICE_PUSD_CHANNEL_ID) {
            const pusdChannel = await client.channels.fetch(process.env.PRICE_PUSD_CHANNEL_ID);
            if (pusdChannel) {
                const oldName = pusdChannel.name;
                const newName = process.env.PRICE_PUSD_TEMPLATE.replace('{value}', formatPriceNumber(firstItem.pricePUSD));
                
                // Log the old and new names to see if they're different
                logWithDetails(`PUSD channel: Current name = "${oldName}", New name = "${newName}"`);
                
                if (oldName !== newName) {
                    try {
                        await pusdChannel.setName(newName);
                        logWithDetails(`Channel name changed: ${oldName} -> ${newName}`);
                    } catch (error) {
                        logWithDetails(`Failed to change PUSD channel name: ${error.message}`);
                    }
                } else {
                    logWithDetails(`PUSD channel name unchanged (already set to "${oldName}")`);
                }
            }
        }

        if (process.env.PRICE_BTC_CHANNEL_ID) {
            const btcChannel = await client.channels.fetch(process.env.PRICE_BTC_CHANNEL_ID);
            if (btcChannel) {
                const oldName = btcChannel.name;
                const newName = process.env.PRICE_BTC_TEMPLATE.replace('{value}', formatPriceNumber(firstMetric.price));
                
                // Log the old and new names to see if they're different
                logWithDetails(`BTC channel: Current name = "${oldName}", New name = "${newName}"`);
                
                if (oldName !== newName) {
                    try {
                        await btcChannel.setName(newName);
                        logWithDetails(`Channel name changed: ${oldName} -> ${newName}`);
                    } catch (error) {
                        logWithDetails(`Failed to change BTC channel name: ${error.message}`);
                    }
                } else {
                    logWithDetails(`BTC channel name unchanged (already set to "${oldName}")`);
                }
            }
        }

        if (process.env.TCR_CHANNEL_ID) {
            const tcrChannel = await client.channels.fetch(process.env.TCR_CHANNEL_ID);
            if (tcrChannel) {
                const oldName = tcrChannel.name;
                const newName = formatTCR(parseFloat(firstMetric.TCR));
                
                // Log the old and new names to see if they're different
                logWithDetails(`TCR channel: Current name = "${oldName}", New name = "${newName}"`);
                
                if (oldName !== newName) {
                    try {
                        await tcrChannel.setName(newName);
                        logWithDetails(`Channel name changed: ${oldName} -> ${newName}`);
                    } catch (error) {
                        logWithDetails(`Failed to change TCR channel name: ${error.message}`);
                    }
                } else {
                    logWithDetails(`TCR channel name unchanged (already set to "${oldName}")`);
                }
            }
        }
        
        // Handle TVL Channel Update
        if (process.env.TVL_CHANNEL_ID) {
            const tvlChannel = await client.channels.fetch(process.env.TVL_CHANNEL_ID);
            if (tvlChannel) {
                const oldName = tvlChannel.name;
                // Calculate TVL from the metrics data and PUSD quantity
                const tvl = await calculateTVL(data);
                const formattedTvl = formatTVL(tvl);
                const newName = process.env.TVL_TEMPLATE.replace('{value}', formattedTvl);
                
                // Log the old and new names to see if they're different
                logWithDetails(`TVL channel: Current name = "${oldName}", New name = "${newName}"`);
                
                if (oldName !== newName) {
                    try {
                        await tvlChannel.setName(newName);
                        logWithDetails(`TVL Channel name changed: ${oldName} -> ${newName}`);
                    } catch (error) {
                        logWithDetails(`Failed to change TVL channel name: ${error.message}`);
                    }
                } else {
                    logWithDetails(`TVL channel name unchanged (already set to "${oldName}")`);
                }
            }
        }

        // Handle PUSD Supply Channel Update
        if (process.env.PUSD_SUPPLY_ID) {
            const pusdSupplyChannel = await client.channels.fetch(process.env.PUSD_SUPPLY_ID);
            if (pusdSupplyChannel) {
                const oldName = pusdSupplyChannel.name;
                // Calculate PUSD Supply by summing the totaldebt values
                const pusdSupply = calculatePUSDSupply(data);
                const formattedSupply = formatPUSDSupply(pusdSupply);
                const newName = process.env.PUSD_SUPPLY_TEMPLATE.replace('{value}', formattedSupply);
                
                // Log the old and new names to see if they're different
                logWithDetails(`PUSD Supply channel: Current name = "${oldName}", New name = "${newName}"`);
                
                if (oldName !== newName) {
                    try {
                        await pusdSupplyChannel.setName(newName);
                        logWithDetails(`PUSD Supply Channel name changed: ${oldName} -> ${newName}`);
                    } catch (error) {
                        logWithDetails(`Failed to change PUSD Supply channel name: ${error.message}`);
                    }
                } else {
                    logWithDetails(`PUSD Supply channel name unchanged (already set to "${oldName}")`);
                }
            }
        }
        
        logWithDetails('All channel updates completed');
    } catch (error) {
        logWithDetails(`Error in updateChannels: ${error.message}`);
        logWithDetails(`Error stack: ${error.stack}`);
    }
}

// Function to fetch API data with timeout
async function fetchDataWithTimeout(timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        // Get the fetch function from the imported module
        const fetch = await fetchModule;
        
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
client.once('ready', async () => {
    logWithDetails(`Bot is ready! Logged in as ${client.user.tag}`);
    
    // Check if channel IDs exist and the bot has access to them
    await checkChannels();
    
    // Test channel update directly
    await testChannelUpdate();
    
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