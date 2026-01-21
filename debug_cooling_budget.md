# Debugging Cooling Budget

## Check these things:

1. **In Browser Network Tab:**
   - Look for POST to `/api/ds/query`
   - Check if the response contains `event.difference`
   - Check if `max_temp` and `threshold` fields exist
   - The postAggregation calculates: `threshold - max_temp = difference`

2. **Possible Issues:**

   a) **Missing threshold field:**
      - `hw.temperature.limit_high_critical` might not exist for server_front sensor
      - `hw.temperature.limit_high_degraded` might not exist for P1/P2_TEMP_SENS

   b) **PostAggregation not executing:**
      - The expression might still have syntax issues in the actual HTTP request
      - Check the Request Payload in Network tab

   c) **Transformations removing data:**
      - The timeSeriesTable or joinByField might be filtering out empty series

3. **Quick Test:**
   - Does the Temperature tab show values for Intake Temperature, Processor 1, and Processor 2?
   - If Temperature tab works but Cooling Budget doesn't, it means the postAggregation calculation is the issue

4. **Compare with original dashboard:**
   - The original uses the exact same queries
   - Check if the original dashboard shows Cooling Budget values
