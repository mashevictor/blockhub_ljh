import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class ChartToolPage extends StatelessWidget {
  const ChartToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  Widget build(BuildContext context) {
    final color = Color(branding.primaryColorValue);
    const values = [3.0, 5.0, 4.0, 7.0, 6.0, 8.0];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('移动图表', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        SizedBox(
          height: 220,
          child: BarChart(
            BarChartData(
              barGroups: [
                for (var i = 0; i < values.length; i++)
                  BarChartGroupData(
                    x: i,
                    barRods: [BarChartRodData(toY: values[i], color: color, width: 16, borderRadius: BorderRadius.circular(4))],
                  ),
              ],
              titlesData: FlTitlesData(
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (v, _) => Text(['一', '二', '三', '四', '五', '六'][v.toInt()]),
                  ),
                ),
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 28)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
            ),
          ),
        ),
      ],
    );
  }
}
