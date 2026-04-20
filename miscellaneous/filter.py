import pandas as pd
biden_df = pd.read_csv('./data/detention-stays_filtered_2022_2023_2024.csv')
trump_df = pd.read_csv('./data/detention-stays_filtered_2025_2026.csv')
columns_to_keep = ['stay_ID', 'stay_book_in_date_time', 'stay_book_out_date_time', 'gender', 'ethnicity', 'birth_country', 'citizenship_country', 'known_terrorist_yes_no', 
                   'suspected_gang_yes_no', 'msc_charge', 'felon', 'case_status', 'case_category', 'final_order_yes_no', 'departure_country', "msc_crime_class"]

biden_df = biden_df[columns_to_keep]
biden_df.dropna()
biden_df["year"] = biden_df["stay_ID"].str.extract(r'_(\d{4})').astype(int)

trump_df = trump_df[columns_to_keep]
trump_df.dropna()
trump_df["year"] = trump_df["stay_ID"].str.extract(r'_(\d{4})').astype(int)

print(biden_df.head(5))
print(trump_df.head(5))

biden_df.to_csv("detention-stays_filtered_biden_cleaned.csv", index=False)
trump_df.to_csv("detention-stays_filtered_trump_cleaned.csv", index=False)
