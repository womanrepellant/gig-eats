# Snackggies / Aggie Bites
A College Station restaurant discovery app built with Next.js App Router. Google Sheets stores TAMU accounts, restaurant reviews, and saved spots. All spreadsheet access runs through server routes using a Google service account; credentials never go to the browser.  Google API and SerpAPI are scraped for information to put on the website.

# Interactive Map
The main functionality of the page is to find restaurants within a 5 mile radius of the Texas A&M College Station campus. The interactive map highlights restaurants around the area based on specified filter criteria. Clicking on a restaurant opens a gui showing a variety of information such as menu, address, average price, phone number, aggie reviews, and links to the google and yelp review sites. 

# Filters
Included are filters that change what restaurants are visible. The main filters are cost, minimum rating, and cuisine type, and dietary preferences. The cost filter was calculated by averaging the cost per meal of every restaurant in the database and separating the costs into three quartiles. The rating system is a weighted calculated average of reviews from yelp and google reviews. Reviews were obtained using yale place api and google place api. Cuisine type and dietary preferences were compiled using a LLM.  

# Top Recommended
The Top recommended page of the website ranks the top 10 restaurants with the highest review averages. Clicking on the restaurants opens up the same gui as the interactive map allowing users to obtain a variety of information on the restaurants.

# Monthly Theme
The monthly theme highlights a specific theme of food in the College Station Area, showing all the restaurants that fall under that theme. Clicking on the restaurants opens up the same gui as the interactive map. Users can also access the interactive map itself and see the locations of the monthly theme restaurant through a button on the page. The page is also decorated to reflect the theme.

# Aggie Ratings
Aggie Ratings require users to login which is run through a google sheet. To leave a review, users must create an account using their Texas A&M email which allows them to leave reviews on the restaurants in the database. These reviews will be shown on the restaurant gui under the "Aggie Review" section.




