from pyspark import pipelines as dp
from pyspark.sql.functions import col, current_timestamp, date_format, md5, concat_ws, row_number, trim, lit
from pyspark.sql.window import Window

TARGET_CATALOG = spark.conf.get("edgeshield.target_catalog", "edgeshield_lakehouse")
SILVER_SCHEMA = spark.conf.get("edgeshield.silver_schema", "silver")
GOLD_SCHEMA = spark.conf.get("edgeshield.gold_schema", "gold")

GOLD_TABLE_PROPERTIES = {
    "quality": "gold",
    "layer": "gold",
    "delta.enableChangeDataFeed": "true"
}

# Dimension Tables remain @dp.materialized_view (since they use batch dp.read)
@dp.materialized_view(
    name=f"{TARGET_CATALOG}.{GOLD_SCHEMA}.dim_device",
    comment="Device metadata dimension",
    table_properties=GOLD_TABLE_PROPERTIES
)
def dim_device():
    sys_df = dp.read(f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_system_metrics")
    cpu_df = dp.read(f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_cpu_metrics")

    # Latest system hardware metadata per device
    sys_window = Window.partitionBy("device_id").orderBy(col("timestamp").desc())
    sys_latest = (
        sys_df.withColumn("rn", row_number().over(sys_window))
        .filter(col("rn") == 1)
        .select("device_id", "hostname", "platform", "boot_time_utc")
    )

    # Latest non-null room per device_id
    if "room" in sys_df.columns:
        room_window = Window.partitionBy("device_id").orderBy(col("timestamp").desc())
        room_latest = (
            sys_df.filter(col("room").isNotNull() & (trim(col("room")) != ""))
            .withColumn("rn", row_number().over(room_window))
            .filter(col("rn") == 1)
            .select("device_id", trim(col("room")).alias("room"))
        )
        sys_with_room = sys_latest.join(room_latest, "device_id", "left")
    else:
        sys_with_room = sys_latest.withColumn("room", lit(None).cast("string"))

    cpu_specs = cpu_df.select("device_id", "logical_cores", "physical_cores").dropDuplicates(["device_id"])

    return (
        sys_with_room.alias("sys")
        .join(cpu_specs.alias("cpu"), "device_id", "left")
        .select(
            md5(col("sys.device_id")).alias("device_key"),
            col("sys.device_id"),
            col("sys.hostname"),
            col("sys.room"),
            col("sys.platform"),
            col("cpu.logical_cores"),
            col("cpu.physical_cores"),
            col("sys.boot_time_utc").alias("last_boot_time_utc"),
            current_timestamp().alias("_updated_at")
        )
    )

# Fact Streaming Tables use @dp.table
@dp.table(
    name=f"{TARGET_CATALOG}.{GOLD_SCHEMA}.fact_cpu_telemetry",
    comment="Incremental Fact table for CPU utilization",
    table_properties=GOLD_TABLE_PROPERTIES
)
def fact_cpu_telemetry():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_cpu_metrics")
        .select(
            col("event_id").alias("telemetry_id"),
            md5(col("device_id")).alias("device_key"),
            date_format(col("timestamp"), "yyyyMMdd").cast("int").alias("date_key"),
            col("timestamp").alias("event_timestamp"),
            col("utilization_percent").alias("cpu_utilization_pct"),
            col("frequency_current_mhz").alias("cpu_freq_current_mhz"),
            col("frequency_max_mhz").alias("cpu_freq_max_mhz"),
            current_timestamp().alias("_ingested_at")
        )
    )

@dp.table(
    name=f"{TARGET_CATALOG}.{GOLD_SCHEMA}.fact_ram_telemetry",
    comment="Incremental Fact table for RAM metrics",
    table_properties=GOLD_TABLE_PROPERTIES
)
def fact_ram_telemetry():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_ram_metrics")
        .select(
            col("event_id").alias("telemetry_id"),
            md5(col("device_id")).alias("device_key"),
            date_format(col("timestamp"), "yyyyMMdd").cast("int").alias("date_key"),
            col("timestamp").alias("event_timestamp"),
            col("utilization_percent").alias("ram_utilization_pct"),
            col("used_bytes").alias("ram_used_bytes"),
            col("available_bytes").alias("ram_available_bytes"),
            col("available_mb").alias("ram_available_mb"),
            current_timestamp().alias("_ingested_at")
        )
    )

@dp.table(
    name=f"{TARGET_CATALOG}.{GOLD_SCHEMA}.fact_disk_telemetry",
    comment="Incremental Fact table for Disk metrics",
    table_properties=GOLD_TABLE_PROPERTIES
)
def fact_disk_telemetry():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_disk_metrics")
        .select(
            col("event_id").alias("telemetry_id"),
            md5(col("device_id")).alias("device_key"),
            date_format(col("timestamp"), "yyyyMMdd").cast("int").alias("date_key"),
            col("timestamp").alias("event_timestamp"),
            col("mount_point"),
            col("utilization_percent").alias("disk_utilization_pct"),
            col("used_bytes").alias("disk_used_bytes"),
            col("free_gb").alias("disk_free_gb"),
            col("read_bytes").alias("disk_read_bytes"),
            col("write_bytes").alias("disk_write_bytes"),
            current_timestamp().alias("_ingested_at")
        )
    )

@dp.table(
    name=f"{TARGET_CATALOG}.{GOLD_SCHEMA}.fact_battery_telemetry",
    comment="Incremental Fact table for Battery metrics",
    table_properties=GOLD_TABLE_PROPERTIES
)
def fact_battery_telemetry():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_battery_metrics")
        .select(
            col("event_id").alias("telemetry_id"),
            md5(col("device_id")).alias("device_key"),
            date_format(col("timestamp"), "yyyyMMdd").cast("int").alias("date_key"),
            md5(concat_ws("_", col("present"), col("power_plugged"))).alias("battery_status_key"),
            col("timestamp").alias("event_timestamp"),
            col("percent").alias("battery_pct"),
            col("health_percentage").alias("battery_health_pct"),
            col("design_capacity_raw"),
            col("full_charge_capacity_raw"),
            current_timestamp().alias("_ingested_at")
        )
    )

@dp.table(
    name=f"{TARGET_CATALOG}.{GOLD_SCHEMA}.fact_environment_telemetry",
    comment="Incremental Fact table for Environment metrics",
    table_properties=GOLD_TABLE_PROPERTIES
)
def fact_environment_telemetry():
    return (
        dp.read_stream(f"{TARGET_CATALOG}.{SILVER_SCHEMA}.cleaned_environment_metrics")
        .select(
            col("event_id").alias("telemetry_id"),
            md5(col("device_id")).alias("device_key"),
            date_format(col("timestamp"), "yyyyMMdd").cast("int").alias("date_key"),
            col("timestamp").alias("event_timestamp"),
            col("temperature_c"),
            col("humidity_percent"),
            current_timestamp().alias("_ingested_at")
        )
    )