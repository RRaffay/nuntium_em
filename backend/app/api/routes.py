from fastapi import APIRouter, HTTPException, Depends
from core.reports import economic_report, economic_report_event
from core.pipeline import run_pipeline, CountryPipelineInputApp
from models import CountryData, Report
from db.data import fetch_country_data, addable_countries, delete_country_data
from datetime import datetime
from auth.users import current_active_user
from auth.auth_db import User

router = APIRouter()


@router.get("/")
async def read_root():
    return {"message": "Welcome to the EM Investor API"}


@router.post("/run-country-pipeline")
async def run_country_pipeline(input_data: CountryPipelineInputApp):
    """
    Run the country pipeline for data processing.

    Args:
        input_data (CountryPipelineInputApp): The input data for the pipeline.

    Returns:
        dict: A dictionary containing the status and result of the pipeline execution.

    Raises:
        HTTPException: If the country is not in the addable countries list or if there's an error during execution.
    """
    try:
        # Check if the country is in the addable countries list
        if input_data.country not in addable_countries:
            raise HTTPException(
                status_code=400, detail="Country not in addable countries list")

        input_data.country_alpha2_code = addable_countries[input_data.country]

        result = await run_pipeline(input_data)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/countries")
async def get_countries():
    """
    Retrieve a list of all countries with their latest data.

    Returns:
        list: A list of dictionaries containing country information including name, timestamp, hours, and number of relevant events.
    """
    countries = await fetch_country_data()
    return [
        {
            "name": country,
            "timestamp": data.timestamp.isoformat(),
            "hours": data.hours,
            "no_relevant_events": data.no_relevant_events
        }
        for country, data in countries.items()
    ]


@router.get("/addable-countries")
async def get_addable_countries():
    """
    Retrieve a list of countries that can be added to the system.

    Returns:
        list: A list of country names that can be added to the system.
    """
    return list(addable_countries.keys())


@router.get("/countries/{country}", response_model=CountryData)
async def get_country_data(country: str):
    """
    Retrieve detailed data for a specific country.

    Args:
        country (str): The name of the country to retrieve data for.

    Returns:
        CountryData: Detailed data for the specified country.

    Raises:
        HTTPException: If the country is not found in the database.
    """
    country_data = await fetch_country_data()
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")
    return country_data[country]


@router.post("/countries/{country}/generate-report", response_model=Report)
async def generate_country_report(country: str, user: User = Depends(current_active_user)):
    """
    Generate an economic report for a specific country.
    Args:
        country (str): The name of the country.

    Returns:
        Report: A Report object containing the generated report content and timestamp.

    Raises:
        HTTPException: If the country is not found in the database.
    """
    country_data = await fetch_country_data()
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    area_of_interest = user.area_of_interest

    report_content = await economic_report(country, area_of_interest) + "\n\n"

    return Report(content=report_content, generated_at=datetime.now().isoformat())


@router.post("/countries/{country}/events/{event_id}/generate-report", response_model=Report)
async def generate_event_report(country: str, event_id: str, user: User = Depends(current_active_user)):
    """
    Generate an economic report for a specific country.

    Args:
        country (str): The name of the country.

    Returns:
        Report: A Report object containing the generated report content and timestamp.

    Raises:
        HTTPException: If the country is not found in the database.
    """

    report_content = """## Report on Lucrative Financial Investments in Colombia's Equities Market

### I. Introduction
The purpose of this report is to identify and analyze lucrative financial investments in Colombia's equities market amid the current political and economic conditions. Given the political instability, security issues, and governance challenges, this report aims to provide emerging market investors with detailed, data-driven investment opportunities in Colombia. The focus will be on equities, considering the unique risks and potential rewards in the Colombian market.

### II. Background Context
#### Political Instability
Colombian President Gustavo Petro has raised concerns about a potential coup, citing allegations of irregular campaign financing. These allegations have polarized the political landscape, with his supporters rallying around him and opposition figures dismissing his claims. This political instability is compounded by ongoing security issues, including attacks from the National Liberation Army (ELN), which have further eroded investor confidence.

#### Security Issues
The ELN's attacks have significant implications for investor sentiment. The recent ceasefire agreement, while a positive step, remains fragile. The security situation is a critical factor for investors to consider, as it directly impacts business operations and overall market stability.

#### Governance Challenges in Barranquilla
In Barranquilla, a rift between former mayor Álex Char and current mayor Jaime Pumarejo has led to governance challenges, including warnings of potential electricity shortages that could affect millions. These local governance issues add another layer of complexity to the investment landscape in Colombia.

#### Legal Issues Involving Former President Álvaro Uribe
Ongoing legal issues involving former President Álvaro Uribe continue to influence the political landscape. These legal battles contribute to the overall uncertainty and volatility in the market, making it essential for investors to stay informed about the latest developments.

### III. Analysis of the Equities Market
#### Current Market Conditions
As of September 2024, the Colombian equities market is experiencing heightened volatility due to the aforementioned political and security issues. Key indices, such as the IGBC, have shown mixed performance, reflecting the market's uncertainty. Despite these challenges, certain sectors present promising investment opportunities.

#### Impact of Political and Security Issues on Market Sentiment
Political instability and security concerns have led to increased market volatility. However, this volatility can also create opportunities for investors who are willing to navigate the risks. Understanding the specific impacts of these issues on different sectors is crucial for making informed investment decisions.

### IV. Sector-Specific Investment Opportunities
#### Energy Sector
**Key Points**: The potential electricity shortages in Barranquilla highlight the importance of the energy sector. Government policies aimed at addressing these shortages and promoting renewable energy investments present significant opportunities.

**Companies to Watch**: Celsia, Grupo Energía Bogotá.

**Justification**: Celsia and Grupo Energía Bogotá are well-positioned to benefit from increased energy demand and government initiatives. Celsia's focus on renewable energy projects aligns with the government's sustainability goals, while Grupo Energía Bogotá's extensive infrastructure and market presence make it a key player in addressing electricity shortages.

#### Financial Sector
**Key Points**: The stability of financial institutions is crucial amid political instability. The financial sector's resilience to economic fluctuations makes it an attractive investment area.

**Companies to Watch**: Bancolombia, Grupo Aval.

**Justification**: Bancolombia and Grupo Aval have demonstrated strong financial health and market positions. Bancolombia's diversified portfolio and robust risk management practices make it a reliable investment, while Grupo Aval's extensive network and market influence provide stability in uncertain times.

#### Consumer Goods Sector
**Key Points**: Consumer confidence and spending patterns are critical indicators of economic health. The governance challenges in Barranquilla could impact regional economic conditions, influencing consumer behavior.

**Companies to Watch**: Grupo Nutresa, Éxito.

**Justification**: Grupo Nutresa and Éxito are leaders in the consumer goods sector, with strong brand recognition and market presence. Grupo Nutresa's strategic growth initiatives and Éxito's extensive retail network position them well to capitalize on consumer demand, even amid regional challenges.

#### Infrastructure and Construction Sector
**Key Points**: Government infrastructure projects and urban development initiatives present significant opportunities. The political rifts in Barranquilla could impact project timelines and funding.

**Companies to Watch**: Cementos Argos, Conconcreto.

**Justification**: Cementos Argos and Conconcreto are key players in Colombia's infrastructure and construction sector. Cementos Argos' strong market position and Conconcreto's involvement in major government projects make them attractive investments, despite potential political disruptions.

### V. Risk Assessment
#### Political Risk
The potential for a coup and ongoing political instability pose significant risks. Investors should consider mitigation strategies such as diversifying their portfolios and closely monitoring political developments.

#### Security Risk
The ELN's attacks and the fragile ceasefire agreement add to the security risks. Companies with robust security measures and contingency plans are better positioned to navigate these challenges.

#### Economic Risk
Political and security issues could lead to economic downturns. Diversification and investing in sectors with strong fundamentals and government support can help mitigate these risks.

### VI. Conclusion
#### Summary of Key Investment Opportunities
The energy, financial, consumer goods, and infrastructure sectors present the most promising investment opportunities in Colombia's equities market. Companies like Celsia, Grupo Energía Bogotá, Bancolombia, Grupo Aval, Grupo Nutresa, Éxito, Cementos Argos, and Conconcreto are well-positioned to navigate the current challenges and capitalize on growth opportunities.

#### Final Recommendations
Investors should adopt a cautious yet opportunistic approach, focusing on sectors and companies with strong fundamentals and government support. Diversification and close monitoring of political and security developments are essential for managing risks.

#### Future Outlook
The Colombian equities market is likely to remain volatile in the near term. However, strategic investments in key sectors can yield significant returns as the country navigates its political and economic challenges.

### VII. Appendices
#### Data Sources
- Trading Economics
- Reuters
- The Dialogue
- CNN
- Statista
- Banco de la República de Colombia

#### Glossary
- **IGBC**: Índice General de la Bolsa de Valores de Colombia
- **ELN**: National Liberation Army
- **FDI**: Foreign Direct Investment

#### Additional Resources
- Further reading on Colombia's political and economic landscape
- Reports on sector-specific investment opportunities in emerging markets"""

    return Report(content=report_content, generated_at=datetime.now().isoformat())
    country_data = await fetch_country_data()
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    country_info = country_data[country]
    event = next((e for e in country_info.events if e.id == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    area_of_interest = user.area_of_interest

    report_content = await economic_report_event(country, area_of_interest, event) + "\n\n"

    return Report(content=report_content, generated_at=datetime.now().isoformat())


@router.delete("/countries/{country}")
async def delete_country(country: str):
    """
    Delete the data for a specific country.

    Args:
        country (str): The name of the country to delete data for.

    Returns:
        dict: A message indicating the success of the deletion.
    """
    country_data = await fetch_country_data()
    if country not in country_data:
        raise HTTPException(status_code=404, detail="Country not found")

    success = await delete_country_data(country)
    if success:
        return {"message": f"Country data for {country} has been deleted"}
    else:
        raise HTTPException(
            status_code=500, detail="Failed to delete country data")
