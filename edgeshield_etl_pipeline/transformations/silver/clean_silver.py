from pyspark import pipelines as dp
from pyspark.sql.functions import col, current_timestamp, lit, trim, when

TARGET_CATALOG = spark.conf.get("edgeshield.target_catalog", "edgeshield_lakehouse")
BRONZE_SCHEMA = spark.conf.get("edgeshield.bronze_schema", "bronze")
SILVER_SCHEMA = spark.conf.get("edgeshield.silver_schema", "silver")

SILVER_TABLE_PROPERTIES = {
    "quality": "silver",
    "layer": "silver",
    "delta.enableChangeDataFeed": "true",
}

# ----- Environment -----
dp.create_streaming_table(
    name=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_environment_metrics",
    comment="Cleaned environment metrics",
    table_properties=SILVER_TABLE_PROPERTIES,
)

@dp.temporary_view()
@dp.expect_or_drop("valid_device", "device_id IS NOT NULL")
@dp.expect_or_drop("valid_temp", "temperature_c BETWEEN -50 AND 100")
def environment_metrics_silver_cleaned():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{BRONZE_SCHEMA}.environment_metrics")
        .withColumn("_processed_at", current_timestamp())
    )

dp.apply_changes(
    target=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_environment_metrics",
    source="environment_metrics_silver_cleaned",
    keys=["event_id"],
    sequence_by=col("timestamp"),
    stored_as_scd_type=1,
)

# ----- System (room normalized) -----
dp.create_streaming_table(
    name=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_system_metrics",
    comment="Cleaned system metrics with room",
    table_properties=SILVER_TABLE_PROPERTIES,
)

@dp.temporary_view()
@dp.expect_or_drop("valid_device", "device_id IS NOT NULL")
def system_metrics_silver_cleaned():
    raw_df = dp.read_stream(f"{TARGET_CATALOG}.{BRONZE_SCHEMA}.system_metrics")
    # hostname can be null for some edge cases; do not drop on hostname
    if "room" in raw_df.columns:
        cleaned = raw_df.withColumn(
            "room",
            when(col("room").isNull() | (trim(col("room")) == ""), lit(None)).otherwise(trim(col("room"))),
        )
    else:
        cleaned = raw_df.withColumn("room", lit(None).cast("string"))
    return cleaned.withColumn("_processed_at", current_timestamp())

dp.apply_changes(
    target=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_system_metrics",
    source="system_metrics_silver_cleaned",
    keys=["event_id"],
    sequence_by=col("timestamp"),
    stored_as_scd_type=1,
)

# ----- CPU -----
dp.create_streaming_table(
    name=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_cpu_metrics",
    comment="Cleaned CPU metrics",
    table_properties=SILVER_TABLE_PROPERTIES,
)

@dp.temporary_view()
@dp.expect_or_drop("valid_device", "device_id IS NOT NULL")
@dp.expect_or_drop("valid_utilization", "utilization_percent BETWEEN 0 AND 100")
def cpu_metrics_silver_cleaned():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{BRONZE_SCHEMA}.cpu_metrics")
        .withColumn("_processed_at", current_timestamp())
    )

dp.apply_changes(
    target=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_cpu_metrics",
    source="cpu_metrics_silver_cleaned",
    keys=["event_id"],
    sequence_by=col("timestamp"),
    stored_as_scd_type=1,
)

# ----- RAM -----
dp.create_streaming_table(
    name=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_ram_metrics",
    comment="Cleaned RAM metrics",
    table_properties=SILVER_TABLE_PROPERTIES,
)

@dp.temporary_view()
@dp.expect_or_drop("valid_device", "device_id IS NOT NULL")
@dp.expect_or_drop("valid_ram_percent", "utilization_percent BETWEEN 0 AND 100")
def ram_metrics_silver_cleaned():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{BRONZE_SCHEMA}.ram_metrics")
        .withColumn("_processed_at", current_timestamp())
    )

dp.apply_changes(
    target=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_ram_metrics",
    source="ram_metrics_silver_cleaned",
    keys=["event_id"],
    sequence_by=col("timestamp"),
    stored_as_scd_type=1,
)

# ----- Disk -----
dp.create_streaming_table(
    name=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_disk_metrics",
    comment="Cleaned disk metrics",
    table_properties=SILVER_TABLE_PROPERTIES,
)

@dp.temporary_view()
@dp.expect_or_drop("valid_device", "device_id IS NOT NULL")
def disk_metrics_silver_cleaned():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{BRONZE_SCHEMA}.disk_metrics")
        .withColumn("_processed_at", current_timestamp())
    )

dp.apply_changes(
    target=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_disk_metrics",
    source="disk_metrics_silver_cleaned",
    keys=["event_id"],
    sequence_by=col("timestamp"),
    stored_as_scd_type=1,
)

# ----- Battery -----
dp.create_streaming_table(
    name=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_battery_metrics",
    comment="Cleaned battery metrics",
    table_properties=SILVER_TABLE_PROPERTIES,
)

@dp.temporary_view()
@dp.expect_or_drop("valid_device", "device_id IS NOT NULL")
def battery_metrics_silver_cleaned():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{BRONZE_SCHEMA}.battery_metrics")
        .withColumn("_processed_at", current_timestamp())
    )

dp.apply_changes(
    target=f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_battery_metrics",
    source="battery_metrics_silver_cleaned",
    keys=["event_id"],
    sequence_by=col("timestamp"),
    stored_as_scd_type=1,
)