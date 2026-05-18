from neo4j import GraphDatabase

from app.config import settings


def _driver():
    return GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))


def publish_capability_to_graph(capability, evidence) -> None:
    try:
        with _driver() as driver:
            with driver.session() as session:
                session.run(
                    """
                    MERGE (c:Capability {id: $id})
                    SET c.name = $name, c.domain = $domain, c.area = $area, c.subCapability = $sub_capability
                    MERGE (e:Evidence {id: $evidence_id})
                    SET e.quote = $quote, e.confidence = $confidence
                    MERGE (c)-[:EXTRACTED_FROM]->(e)
                    """,
                    id=capability.id,
                    name=capability.standardized_name,
                    domain=capability.domain,
                    area=capability.area,
                    sub_capability=capability.sub_capability,
                    evidence_id=evidence.id,
                    quote=evidence.quote,
                    confidence=evidence.confidence,
                )
    except Exception:
        return

