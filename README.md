# app-journey

## Level 1 Complete: follow-up questions and error handling. See questions and answers below:

### 1. What is JSON? Why does the API send data back in that format instead of plain text?
    JSON is like a universal format that any language can interpret (language agnostic). The API sends back data in this format for this reason. JSON is also easy to interpret unlike binary code.

### 2. What is fetch() doing? Walk me through what happens between the moment you click Search and the moment the temperature appears on screen.
    It's a browser-native function that sends an HTTP request to a URL and waits for a response. The sequence is: click Search → fetch() sends a request to your server (/api/weather?city=Sydney) → your server asks OpenWeatherMap → OpenWeatherMap sends JSON back → your server forwards it → fetch() receives it → you call .json() to parse the raw text into a JavaScript object → your code reads properties off that object to update the page. The key concept you're missing: fetch is making a network request, not just "grabbing data" from somewhere local.

### 3. What happens when you type a fake city? Where in the code does that get caught, and what does the user see?
    When you type a fake city, an error is thrown and the dashboard displays "No city found in "example wrong city". Please check spelling and try again". The input city is checked in the: if !response.ok section of the code. If the error is thrown (i.e. 404 error), this code then triggers the err.message to be displayed. The err.message is whatever string is denoted in the new Error block