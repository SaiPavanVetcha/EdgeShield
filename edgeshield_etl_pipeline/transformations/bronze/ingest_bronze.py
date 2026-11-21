from pyspark import pipelines as dp
from pyspark.sql.functions import current_timestamp

# If tables are hive_metastore.edgeshield_db.*, set in DLT config:
# edgeshield.source_catalog = hive_metastore
SOURCE_CATALOG = spark.conf.get("edgeshield.source_catalog", "hive_metastore")
SOURCE_SCHEMA = spark.conf.get("edgeshield.source_schema", "edgeshield_db")
TARGET_CATALOG = spark.conf.get("edgeshield.target_catalog", "edgeshield_lakehouse")
TARGET_SCHEMA = spark.conf.get("edgeshield.target_schema", "bronze")

BRONZE_TABLE_PROPERTIES = {
    "quality": "bronze",
    "layer": "bronze",
    "delta.enableChangeDataFeed": "true",
}

def _stream(table_name: str):
    return (
        spark.readStream.format("delta")
        .option("skipChangeCommits", "true")
        .table(f"{SOURCE_CATALOG}.{SOURCE_SCHEMA}.{table_name}")
        .withColumn("_ingested_at", current_timestamp())
    )

@dp.table(
    name=f"{TARGET_CATALOG}.{TARGET_SCHEMA}.system_metrics",
    comment="Bronze system metrics (includes room when present)",
    table_properties=BRONZE_TABLE_PROPERTIES,
)
def system_metrics_bronze():
    return _stream("system_metrics")

@dp.table(
    name=f"{TARGET_CATALOG}.{TARGET_SCHEMA}.cpu_metrics",
    comment="Bronze CPU metrics",
    table_properties=BRONZE_TABLE_PROPERTIES,
)
def cpu_metrics_bronze():
    return _stream("cpu_metrics")

@dp.table(
    name=f"{TARGET_CATALOG}.{TARGET_SCHEMA}.ram_metrics",
    comment="Bronze RAM metrics",
    table_properties=BRONZE_TABLE_PROPERTIES,
)
def ram_metrics_bronze():
    return _stream("ram_metrics")

@dp.table(
    name=f"{TARGET_CATALOG}.{TARGET_SCHEMA}.disk_metrics",
    comment="Bronze disk metrics",
    table_properties=BRONZE_TABLE_PROPERTIES,
)
def disk_metrics_bronze():
    return _stream("disk_metrics")

@dp.table(
    name=f"{TARGET_CATALOG}.{TARGET_SCHEMA}.battery_metrics",
    comment="Bronze battery metrics",
    table_properties=BRONZE_TABLE_PROPERTIES,
)
def battery_metrics_bronze():
    return _stream("battery_metrics")

@dp.table(
    name=f"{TARGET_CATALOG}.{TARGET_SCHEMA}.environment_metrics",
    comment="Bronze environment metrics (ESP32)",
    table_properties=BRONZE_TABLE_PROPERTIES,
)
def environment_metrics_bronze():
    return _stream("environment_metrics")